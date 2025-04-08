import {
    Action,
    composeContext,
    elizaLogger,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@moxie-protocol/core";
import {
    MoxieClientWallet,
    MoxieUser,
    MoxieWalletClient,
    Portfolio,
} from "@moxie-protocol/moxie-agent-lib";
import { swapTokenToETH } from "../utils/token";
import { DustRequestSchema } from "../types";
import { dustRequestTemplate } from "../templates";
import { swap } from "../utils/swap";
import {
    ETH_ADDRESS,
    MOXIE,
    MOXIE_TOKEN_ADDRESS,
    MOXIE_TOKEN_DECIMALS,
} from "../constants/constants";
import { ethers } from "ethers";

export const dustWalletAction: Action = {
    name: "DUST_WALLET_TO_ETH",
    similes: [
        "CLEAN_WALLET",
        "DUST_MY_TOKENS",
        "REMOVE_DUST",
        "SWAP_DUST_TO_ETH",
        "CLEAR_LOW_VALUE_TOKENS",
        "CLEAR_THE_DUST_OUT",
        "SELL_ALL_TOKENS_UNDER",
    ],
    validate: async () => true,
    description:
        "Checks the agent wallet for any tokens under a given USD value and swaps them to ETH.",
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Dust my wallet for anything under $5." },
            },
            {
                user: "{{user2}}",
                content: { text: "Swapped 3 dust tokens into ETH." },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Swap tokens under $10 into ETH." },
            },
            {
                user: "{{user2}}",
                content: { text: "Swapped 4 tokens under $10 into ETH." },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Clear all the low-value tokens from my wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Swapped 2 dust tokens into ETH." },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Preview what tokens you'd dust from my wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `Preview: You have 4 dust token(s) totaling ~$12.45:\n- 0xabc... (100000 tokens worth ~$2.14)\n- 0xdef... (90000 tokens worth ~$3.20)\n- 0x123... (5000 tokens worth ~$2.08)\n- 0x456... (30000 tokens worth ~$5.03)`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Show me the dust before swapping anything." },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `Preview: You have 2 dust token(s) totaling ~$6.78:\n- 0x789... (12000 tokens worth ~$3.30)\n- 0xabc... (18000 tokens worth ~$3.48)`,
                },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {
            const traceId = message.id;
            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const context = composeContext({
                state,
                template: dustRequestTemplate,
            });

            const details = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: DustRequestSchema,
            });
            const extractedValue = details.object as {
                threshold: number;
            };
            const threshold = extractedValue?.threshold ?? 5;

            const wallet = state?.moxieWalletClient as MoxieWalletClient;
            const agentWallet = state?.agentWallet as MoxieClientWallet;
            const moxieUserId = (state?.moxieUserInfo as MoxieUser)?.id;

            const { tokenBalances }: Portfolio =
                (state?.agentWalletBalance as Portfolio) ?? {
                    tokenBalances: [],
                };
            const dustTokens = tokenBalances.filter(
                (t) =>
                    t.token.balanceUSD < threshold &&
                    t.token.balance > 0 &&
                    // ignore ETH
                    t.address !== ETH_ADDRESS.toLowerCase()
            );

            if (!dustTokens.length) {
                await callback?.({
                    text: `No tokens under $${threshold} found in your wallet.`,
                });

                return true;
            }

            const totalUsdValue = dustTokens
                .reduce((sum, token) => sum + token.token.balanceUSD, 0)
                .toFixed(2);
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            for (const token of dustTokens) {
                const txHash = await swap(
                    traceId,
                    MOXIE_TOKEN_ADDRESS,
                    MOXIE,
                    token.address,
                    token.token.baseToken.symbol,
                    moxieUserId,
                    agentWallet.address,
                    BigInt(token.token.balance),
                    provider,
                    18,
                    MOXIE_TOKEN_DECIMALS,
                    callback,
                    state.agentWalletBalance as Portfolio,
                    wallet
                );
                elizaLogger.debug(
                    traceId,
                    `[tokenSwap] [${moxieUserId}] [tokenSwapAction] [SWAP] [TOKEN_TO_CREATOR] [BUY_QUANTITY] buyAmountInWEI: ${buyAmountInWEI}`
                );
                if (!txHash) {
                    elizaLogger.warn(`Swap failed for token ${token.address}`);
                    await callback({
                        text: ``,
                    });
                }
            }

            await callback?.({
                text: `Swapped ${dustTokens.length} dust token(s) into ETH (~$${totalUsdValue}).`,
            });
        } catch (error) {
            elizaLogger.error("Error dusting wallet:", error);
            callback?.({
                text: "An error occurred while dusting your wallet. Please try again later.",
            });
        }
    },
};
