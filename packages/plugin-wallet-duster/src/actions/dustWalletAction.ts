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
                if (token.token.baseToken.symbol === "WETH") continue;
                elizaLogger.info("Dusting token", JSON.stringify(token));
                await swap(
                    traceId,
                    token.token.baseToken.address,
                    token.token.baseToken.symbol,
                    moxieUserId,
                    agentWallet.address,
                    ethers.parseUnits(token.token.balance.toString(), 18),
                    provider,
                    callback,
                    state.agentWalletBalance as Portfolio,
                    wallet
                );
            }

            await callback?.({
                text: `\nDusted ${dustTokens.length} dust token(s) into ETH (~$${totalUsdValue}).`,
            });
        } catch (error) {
            elizaLogger.error("Error dusting wallet:", error);
            callback?.({
                text: "An error occurred while dusting your wallet. Please try again later.",
            });
        }
    },
};
