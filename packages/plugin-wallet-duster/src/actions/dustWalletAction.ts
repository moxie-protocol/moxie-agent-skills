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
import { DustRequestSchema } from "../types";
import { dustRequestTemplate } from "../templates";
import { swap } from "../utils/swap";
import { ETH_ADDRESS } from "../constants/constants";
import { ethers } from "ethers";

export const dustWalletAction: Action = {
    name: "DUST_WALLET_TO_ETH",
    similes: [
        "CLEAN_WALLET",
        "DUST_MY_TOKENS",
        "REMOVE_DUST",
        "DUST_TO_ETH",
        "CLEAR_LOW_VALUE_TOKENS",
        "CLEAR_THE_DUST_OUT",
        "SELL_ALL_TOKENS_UNDER",
    ],
    validate: async () => true,
    description:
        "Checks the agent wallet for any dust tokens or low-value tokens under a given USD value threshold and dusts them to ETH on Base.",
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Dust my wallet for anything under $5." },
            },
            {
                user: "{{user2}}",
                content: { text: "Dusted 3 dust tokens into ETH." },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Dust my wallet" },
            },
            {
                user: "{{user2}}",
                content: { text: "Dusted 1 token under $5 into ETH." },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Dust my agent wallet for tokens under $10 into ETH.",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "Dusted 4 tokens under $10 into ETH." },
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

            await callback?.({
                text: `Initializing dusting process on your agent wallet for tokens under $${threshold}...\n`,
            });

            const wallet = state?.moxieWalletClient as MoxieWalletClient;
            const agentWallet = state?.agentWallet as MoxieClientWallet;
            const moxieUserId = (state?.moxieUserInfo as MoxieUser)?.id;

            const { tokenBalances }: Portfolio =
                (state?.agentWalletBalance as Portfolio) ?? {
                    tokenBalances: [],
                };
            const dustTokens = tokenBalances.filter(
                (t) =>
                    ((threshold > 0.01 &&
                        t.token.balanceUSD < threshold &&
                        t.token.balanceUSD > 0.01) ||
                        (threshold <= 0.01 &&
                            t.token.balanceUSD < threshold)) &&
                    t.token.balance > 0 &&
                    // ignore ETH
                    t.token.baseToken.address.toLowerCase() !==
                        "0x0000000000000000000000000000000000000000".toLowerCase() &&
                    t.token.baseToken.address.toLowerCase() !==
                        ETH_ADDRESS.toLowerCase()
            );

            if (!dustTokens.length) {
                await callback?.({
                    text: `No tokens under $${threshold} found in your wallet.${threshold > 0.01 ? `\n\nOnly tokens above $0.01 have been checked for dusting. To dust tokens below $0.01, set the threshold to $0.01 or below.` : ""}`,
                });

                return true;
            }

            let totalUsdValue = 0;
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            let dustedTokenCount = 0;
            for (const token of dustTokens) {
                const dustedToken = await swap(
                    traceId,
                    token.token.baseToken.address,
                    token.token.baseToken.symbol,
                    moxieUserId,
                    agentWallet.address,
                    provider,
                    callback,
                    wallet
                );
                if (dustedToken !== null) {
                    dustedTokenCount++;
                    totalUsdValue += token.token.balanceUSD;
                }
            }

            await callback?.({
                text: `\nDusted ${dustedTokenCount} dust token${dustedTokenCount === 1 ? "" : "s"} into ETH ($${totalUsdValue < 0.01 ? "< $0.01" : `~ $${totalUsdValue.toFixed(2)}`}).${threshold > 0.01 ? `\n\nOnly tokens above $0.01 have been dusted. To dust tokens below $0.01, set the threshold to $0.01 or below.` : ""}`,
            });
        } catch (error) {
            elizaLogger.error("Error dusting wallet:", error);
            callback?.({
                text: "An error occurred while dusting your wallet. Please try again later.",
            });
        }
    },
};
