import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
    type ActionExample,
    composeContext,
    generateObject,
    ModelClass,
} from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-lib/src/wallet";
import { coinTossTemplate } from "../templates";
import { CoinTossBetParameters } from "../types";
import { type Hex } from "viem";
import {
    CASINO_GAME_TYPE,
    CasinoChainId,
    casinoChainIds,
    CoinToss,
    casinoChainById,
    Token,
} from "@betswirl/sdk-core";
import { getCasinoTokens, placeBet, getBet } from "../utils/betswirl";
import { ethers } from "ethers";

export const coinTossAction: Action = {
    name: "COIN_TOSS",
    similes: ["COIN_FLIP", "DOUBLE_OR_NOTHING", "TOSS_A_COIN"],
    description: "Flip a coin on Base",
    suppressInitialMessage: true,
    validate: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State
    ) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            elizaLogger.log("Starting COIN_TOSS handler...");

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }
            const context = composeContext({
                state,
                template: coinTossTemplate,
            });

            const coinTossDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: CoinTossBetParameters,
            });

            // Validate the chain
            const wallet = state.agentWallet as MoxieWalletClient;
            const chainId = Number(
                (await wallet.wallet.provider.getNetwork()).chainId
            ) as CasinoChainId;
            if (!casinoChainIds.includes(chainId)) {
                throw new Error(
                    `The chain id must be one of ${casinoChainIds.join(", ")}`
                );
            }

            // Validates the inputs
            const { face, betAmount, token } = coinTossDetails.object as {
                face: string;
                betAmount: string;
                token: string;
            };

            const casinoChain = casinoChainById[chainId];
            const casinoTokens = await getCasinoTokens(wallet);
            let selectedToken: Token;
            if (token) {
                // Validate the token
                selectedToken = casinoTokens.find(
                    (casinoToken) => casinoToken.symbol === token
                );
                if (!selectedToken) {
                    throw new Error(
                        `The token must be one of ${casinoTokens.map((casinoToken) => casinoToken.symbol).join(", ")}`
                    );
                }
            } else {
                selectedToken = casinoTokens.find(
                    (casinoToken) =>
                        casinoToken.symbol ===
                        casinoChain.viemChain.nativeCurrency.symbol
                );
            }
            // Validate the bet amount
            const betAmountInWei = ethers.parseUnits(
                betAmount,
                selectedToken.decimals
            );
            if (betAmountInWei < 0n) {
                throw new Error("The bet amount must be greater than 0");
            }
            // Validate face is heads or tails
            if (!face || !["HEADS", "TAILS"].includes(face)) {
                throw new Error("Face must be heads or tails");
            }

            elizaLogger.log(
                `Tossing ${betAmount} ${selectedToken.symbol} on ${face}...`
            );
            const hash = await placeBet(
                wallet,
                CASINO_GAME_TYPE.COINTOSS,
                CoinToss.encodeInput(face),
                CoinToss.getMultiplier(face),
                {
                    betAmount: betAmountInWei,
                    betToken: selectedToken.address,
                    betCount: 1,
                    receiver: wallet.address as Hex,
                    stopGain: 0n,
                    stopLoss: 0n,
                }
            );

            const bet = await getBet(wallet, hash);

            const resolutionMessage = `You ${bet.isWin ? "Won" : "Lost"}, your Payout is ${bet.formattedPayout} ETH, Bet tx: ${bet.betTxnHash}, Resolution tx hash: ${bet.rollTxnHash}`;

            elizaLogger.success(resolutionMessage);
            await callback({
                text: resolutionMessage,
            });
        } catch (error) {
            elizaLogger.error(error.message);
            await callback({
                text: error.message,
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Double 0.01 ETH on heads",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You Lost, your Payout is 0.00003 ETH, Bet tx: 0x6ba8a0c3e861b036f052709f56412084806376fbaf24b15bce4920a8a53095af, Resolution tx hash: 0x8ed5541c45b6c7083b3e5795f52f92827748e93e6562ec126f4a1cf22b433f77",
                    action: "COIN_TOSS",
                },
            },
        ],
    ] as ActionExample[][],
};
