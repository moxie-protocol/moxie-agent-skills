import { type Hex } from "viem";
import { ethers } from "ethers";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib/src/wallet";
import {
    casinoChainIds,
    casinoChainById,
    type CASINO_GAME_TYPE,
    type CasinoChainId,
    type GameEncodedInput,
    type RawBetRequirements,
    type Token,
    fetchBetByHash,
    getBetRequirementsFunctionData,
    getChainlinkVrfCostFunctionData,
    getPlaceBetFunctionData,
    parseRawBetRequirements,
    chainNativeCurrencyToToken,
    getAllowanceFunctionData,
    getApproveFunctionData,
} from "@betswirl/sdk-core";
import { getCasinoTokens } from "../providers/casinoTokens";

export async function getChainIdFromWallet() {
    const chainId = 8453 as CasinoChainId;
    if (!casinoChainIds.includes(chainId)) {
        throw new Error(
            `The chain id must be one of ${casinoChainIds.join(", ")}`
        );
    }
    return chainId;
}

export async function getBetToken(
    chainId: CasinoChainId,
    tokenSymbolInput: string
) {
    const casinoChain = casinoChainById[chainId];
    const casinoTokens = await getCasinoTokens();
    let selectedToken: Token;
    if (tokenSymbolInput) {
        if (
            tokenSymbolInput.toUpperCase() ===
            casinoChain.viemChain.nativeCurrency.symbol
        ) {
            selectedToken = chainNativeCurrencyToToken(
                casinoChain.viemChain.nativeCurrency
            );
        } else {
            selectedToken = casinoTokens.find(
                (casinoToken) =>
                    casinoToken.symbol === tokenSymbolInput.toUpperCase()
            );
        }
    }
    if (!selectedToken) {
        throw new Error(
            `The token must be one of ${casinoTokens.map((casinoToken) => casinoToken.symbol).join(", ")}`
        );
    }
    return selectedToken;
}

export function getBetAmountInWei(betAmount: string, token: Token) {
    if (betAmount) {
        const betAmountInWei = ethers.parseUnits(betAmount, token.decimals);
        if (betAmountInWei <= 0n) {
            throw new Error("The bet amount must be greater than 0");
        }
        return betAmountInWei;
    } else {
        throw new Error("You must specify the bet amount.");
    }
}

async function getBetRequirements(
    chainId: CasinoChainId,
    game: CASINO_GAME_TYPE,
    betToken: Token,
    multiplier: number
) {
    try {
        const betRequirementsFunctionData = getBetRequirementsFunctionData(
            betToken.address,
            multiplier,
            chainId
        );
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const betRequirementsContract = new ethers.Contract(
            betRequirementsFunctionData.data.to,
            betRequirementsFunctionData.data.abi,
            provider
        );
        const rawBetRequirements: RawBetRequirements =
            await betRequirementsContract[
                betRequirementsFunctionData.data.functionName
            ](...betRequirementsFunctionData.data.args);

        return parseRawBetRequirements(
            rawBetRequirements,
            betToken,
            multiplier,
            game,
            chainId
        );
    } catch (error) {
        throw new Error(
            `An error occured while getting the bet requirements: ${error.shortMessage}`
        );
    }
}

async function getChainlinkVrfCost(
    chainId: CasinoChainId,
    game: CASINO_GAME_TYPE,
    betToken: Hex,
    betCount: number,
    gasPrice: bigint
) {
    try {
        const chainlinkVRFCostFunctionData = getChainlinkVrfCostFunctionData(
            game,
            betToken,
            betCount,
            chainId
        );
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const chainlinkVRFCostContract = new ethers.Contract(
            chainlinkVRFCostFunctionData.data.to,
            chainlinkVRFCostFunctionData.data.abi,
            provider
        );
        const chainlinkVRFCost: bigint = await chainlinkVRFCostContract[
            chainlinkVRFCostFunctionData.data.functionName
        ](...chainlinkVRFCostFunctionData.data.args, {
            gasPrice,
        });
        return chainlinkVRFCost;
    } catch (error) {
        throw new Error(
            `An error occured while getting the chainlink vrf cost: ${error.shortMessage}`
        );
    }
}

export async function placeBet(
    chainId: CasinoChainId,
    walletClient: MoxieWalletClient,
    game: CASINO_GAME_TYPE,
    gameEncodedInput: GameEncodedInput,
    gameMultiplier: number,
    casinoGameParams: {
        betAmount: bigint;
        betToken: Token;
        betCount: number;
        receiver: Hex;
        stopGain: bigint;
        stopLoss: bigint;
    }
) {
    const betRequirements = await getBetRequirements(
        chainId,
        game,
        casinoGameParams.betToken,
        gameMultiplier
    );

    if (!betRequirements.isAllowed) {
        throw new Error(`The token isn't allowed for betting`);
    }
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
            tokenAddress: casinoGameParams.betToken.address,
            stopGain: casinoGameParams.stopGain,
            stopLoss: casinoGameParams.stopLoss,
        },
        chainId
    );

    try {
        await approveIfERC20(
            walletClient,
            chainId,
            game,
            casinoGameParams.betToken,
            casinoGameParams.betAmount
        );

        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const gasPrice = ((await provider.getFeeData()).gasPrice * 120n) / 100n;
        const vrfCost =
            ((await getChainlinkVrfCost(
                chainId,
                game,
                casinoGameParams.betToken.address,
                casinoGameParams.betCount,
                gasPrice
            )) *
                120n) /
            100n;
        const { hash: betHash } = await walletClient.sendTransaction(
            chainId.toString(),
            {
                fromAddress: walletClient.address,
                toAddress: functionData.data.to,
                data: functionData.encodedData,
                value: functionData.extraData.getValue(
                    vrfCost
                ) as unknown as number,
                gasPrice: Number(gasPrice),
            }
        );

        return betHash as Hex;
    } catch (error) {
        throw new Error(
            `An error occured while placing the bet: ${error.shortMessage || error.message}`
        );
    }
}

export async function approveIfERC20(
    walletClient: MoxieWalletClient,
    chainId: number,
    game: CASINO_GAME_TYPE,
    token: Token,
    amount: bigint
) {
    const casinoChain = casinoChainById[chainId as CasinoChainId];
    if (token.symbol !== casinoChain.viemChain.nativeCurrency.symbol) {
        const spender = walletClient.address as Hex;
        const allowanceFunctionData = getAllowanceFunctionData(
            token.address,
            spender,
            casinoChain.contracts.games[game]!.address
        );
        const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const tokenContract = new ethers.Contract(
            allowanceFunctionData.data.to,
            allowanceFunctionData.data.abi,
            provider
        );
        const rawAllowance: bigint = await tokenContract[
            allowanceFunctionData.data.functionName
        ](...allowanceFunctionData.data.args);

        if (!rawAllowance || rawAllowance < amount) {
            const amountToApprove = amount - (rawAllowance || 0n);
            const functionData = getApproveFunctionData(
                token.address,
                spender,
                amountToApprove
            );
            await walletClient.sendTransaction(chainId.toString(), {
                toAddress: functionData.data.to,
                data: functionData.encodedData,
            });
        }
    }
}

export async function getBet(
    chainId: CasinoChainId,
    txHash: Hex,
    theGraphKey?: string
) {
    try {
        let betData = await fetchBetByHash(txHash, { chainId, theGraphKey });
        const startTime = Date.now(); // Record the start time
        const timeout = 60000; // 1 minute timeout
        while ((!betData.bet || !betData.bet.isResolved) && !betData.error) {
            if (Date.now() - startTime >= timeout) {
                throw new Error(
                    "Timeout: Bet data retrieval exceeded 1 minute."
                );
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
            betData = await fetchBetByHash(txHash, { chainId, theGraphKey });
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
