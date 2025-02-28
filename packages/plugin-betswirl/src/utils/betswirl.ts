// import { elizaLogger } from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-lib/src/wallet";
import { type Hex } from "viem";
import { ethers } from "ethers";
import {
    Bet_OrderBy,
    CASINO_GAME_TYPE,
    type CasinoChainId,
    // Dice,
    // DiceNumber,
    GAS_TOKEN_ADDRESS,
    GameEncodedInput,
    OrderDirection,
    // RawBetRequirements,
    type RawCasinoToken,
    // Roulette,
    // RouletteNumber,
    Token,
    casinoChainById,
    fetchBetByHash,
    fetchBets,
    getBetRequirementsFunctionData,
    getCasinoTokensFunctionData,
    getChainlinkVrfCostFunctionData,
    getPlaceBetFunctionData,
    maxHarcodedBetCountByType,
} from "@betswirl/sdk-core";

export async function getCasinoTokens(
    walletClient: MoxieWalletClient
): Promise<Token[]> {
    const chainId = Number(
        (await walletClient.wallet.provider.getNetwork()).chainId
    ) as CasinoChainId;
    const casinoChain = casinoChainById[chainId];

    const casinoTokensFunctionData = getCasinoTokensFunctionData(chainId);
    const casinoTokensContract = new ethers.Contract(
        casinoTokensFunctionData.data.to,
        casinoTokensFunctionData.data.abi,
        walletClient.wallet.provider
    );
    const rawCasinoTokens: RawCasinoToken[] =
        await casinoTokensContract[
            casinoTokensFunctionData.data.functionName
        ]();

    return rawCasinoTokens
        .filter((rawToken) => rawToken.token.allowed && !rawToken.token.paused)
        .map((rawToken) => ({
            address: rawToken.tokenAddress,
            symbol:
                rawToken.tokenAddress === GAS_TOKEN_ADDRESS
                    ? casinoChain.viemChain.nativeCurrency.symbol
                    : rawToken.symbol,
            decimals: rawToken.decimals,
        }));
}

async function getBetRequirements(
    walletClient: MoxieWalletClient,
    game: CASINO_GAME_TYPE,
    betToken: Hex,
    multiplier: number
) {
    const chainId = Number(
        (await walletClient.wallet.provider.getNetwork()).chainId
    ) as CasinoChainId;

    try {
        const betRequirementsFunctionData = getBetRequirementsFunctionData(
            betToken,
            multiplier,
            chainId
        );
        const betRequirementsContract = new ethers.Contract(
            betRequirementsFunctionData.data.to,
            betRequirementsFunctionData.data.abi,
            walletClient.wallet.provider
        );
        const rawBetRequirements = await betRequirementsContract[
            betRequirementsFunctionData.data.functionName
        ](betToken, multiplier);

        return {
            maxBetAmount: BigInt(rawBetRequirements[1]),
            maxBetCount: Math.min(
                Number(rawBetRequirements[2]),
                maxHarcodedBetCountByType[game]
            ),
        };
    } catch (error) {
        throw new Error(
            `An error occured while getting the bet requirements: ${error.shortMessage}`
        );
    }
}

async function getChainlinkVrfCost(
    walletClient: MoxieWalletClient,
    game: CASINO_GAME_TYPE,
    betToken: Hex,
    betCount: number,
    gasPrice: bigint
) {
    const chainId = Number(
        (await walletClient.wallet.provider.getNetwork()).chainId
    ) as CasinoChainId;

    try {
        const chainlinkVRFCostFunctionData = getChainlinkVrfCostFunctionData(
            game,
            betToken,
            betCount,
            chainId
        );
        const vrfCost = await walletClient.wallet.call({
            to: chainlinkVRFCostFunctionData.data.to,
            data: chainlinkVRFCostFunctionData.encodedData,
            gasPrice,
        });

        if (!vrfCost) {
            return 0n;
        }
        return BigInt(vrfCost || 0n);
    } catch (error) {
        throw new Error(
            `An error occured while getting the chainlink vrf cost: ${error.shortMessage}`
        );
    }
}

export async function placeBet(
    walletClient: MoxieWalletClient,
    game: CASINO_GAME_TYPE,
    gameEncodedInput: GameEncodedInput,
    gameMultiplier: number,
    casinoGameParams: {
        betAmount: bigint;
        betToken: Hex;
        betCount: number;
        receiver: Hex;
        stopGain: bigint;
        stopLoss: bigint;
    }
) {
    const chainId = Number(
        (await walletClient.wallet.provider.getNetwork()).chainId
    ) as CasinoChainId;

    const betRequirements = await getBetRequirements(
        walletClient,
        game,
        casinoGameParams.betToken,
        gameMultiplier
    );

    if (casinoGameParams.betAmount > betRequirements.maxBetAmount) {
        throw new Error(
            `Bet amount should be less than ${betRequirements.maxBetAmount}`
        );
    }
    if (casinoGameParams.betCount > betRequirements.maxBetCount) {
        throw new Error(
            `Bet count should be less than ${betRequirements.maxBetCount}`
        );
    }

    const functionData = getPlaceBetFunctionData(
        {
            betAmount: casinoGameParams.betAmount,

            game,
            gameEncodedInput: gameEncodedInput,
            receiver: casinoGameParams.receiver,
            betCount: casinoGameParams.betCount,
            tokenAddress: casinoGameParams.betToken,
            stopGain: casinoGameParams.stopGain,
            stopLoss: casinoGameParams.stopLoss,
        },
        chainId
    );

    try {
        const gasPrice =
            ((await walletClient.wallet.provider.getFeeData()).gasPrice *
                120n) /
            100n;

        const vrfCost =
            ((await getChainlinkVrfCost(
                walletClient,
                game,
                casinoGameParams.betToken,
                casinoGameParams.betCount,
                gasPrice
            )) *
                120n) /
            100n;
        const { hash: betHash } = await walletClient.sendTransaction(
            chainId.toString(),
            {
                toAddress: functionData.data.to,
                data: functionData.encodedData,
                value: (casinoGameParams.betToken === GAS_TOKEN_ADDRESS
                    ? functionData.formattedData.totalBetAmount + vrfCost
                    : vrfCost) as unknown as number,
                gasPrice: Number(gasPrice),
            }
        );

        return betHash as Hex;
    } catch (error) {
        throw new Error(
            `An error occured while placing the bet: ${error.shortMessage}`
        );
    }
}

export async function getBet(walletClient: MoxieWalletClient, txHash: Hex) {
    const chainId = Number(
        (await walletClient.wallet.provider.getNetwork()).chainId
    ) as CasinoChainId;
    try {
        let betData = await fetchBetByHash({ chainId }, txHash);
        const startTime = Date.now(); // Record the start time
        const timeout = 60000; // 1 minute timeout
        while ((!betData.bet || !betData.bet.isResolved) && !betData.error) {
            if (Date.now() - startTime >= timeout) {
                throw new Error(
                    "Timeout: Bet data retrieval exceeded 1 minute."
                );
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            betData = await fetchBetByHash({ chainId }, txHash);
            if (betData.error) {
                break;
            }
        }
        if (betData.error) {
            throw new Error(
                `[${betData.error.code}] Error fetching bet: ${betData.error.message}`
            );
        }
        return betData.bet;
    } catch (error) {
        throw new Error(`An error occured while getting the bet: ${error}`);
    }
}

export async function getBets(
    chainId: CasinoChainId,
    bettor: Hex,
    game: CASINO_GAME_TYPE,
    _token: Hex
) {
    try {
        const bets = await fetchBets(
            { chainId },
            {
                bettor,
                game,
                // token: {
                //     address: token
                // }
            },
            undefined,
            5,
            {
                key: Bet_OrderBy.BetTimestamp,
                order: OrderDirection.Desc,
            }
        );
        if (bets.error) {
            throw new Error(
                `[${bets.error.code}] Error fetching bets: ${bets.error.message}`
            );
        }
        return bets.bets;
    } catch (error) {
        throw new Error(`An error occured while getting the bet: ${error}`);
    }
}
