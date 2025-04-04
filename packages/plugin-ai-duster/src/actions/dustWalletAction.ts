import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";
import { MoxieWalletClient, Portfolio } from "@moxie-protocol/moxie-agent-lib";
import { swapTokenToETH } from "../utils/token";

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
            const threshold =
                typeof options?.dustThreshold === "number"
                    ? options.dustThreshold
                    : 5;

            const wallet = state?.agentWallet as MoxieWalletClient;

            const { tokenBalances }: Portfolio =
                (state?.agentWalletBalance as Portfolio) ?? {
                    tokenBalances: [],
                };
            console.log(tokenBalances);
            const dustTokens = tokenBalances.filter(
                (t) =>
                    t.token.balanceUSD < threshold &&
                    t.token.balance > 0 &&
                    // ignore ETH
                    t.address !== "0x0000000000000000000000000000000000000000"
            );

            if (!dustTokens.length) {
                return callback?.({
                    text: `No tokens under $${threshold} found in your wallet.`,
                });
            }

            const totalUsdValue = dustTokens
                .reduce((sum, token) => sum + token.token.balanceUSD, 0)
                .toFixed(2);

            for (const token of dustTokens) {
                const txHash = await swapTokenToETH(
                    wallet,
                    token.address,
                    token.token.balance.toString()
                );
                if (!txHash) {
                    console.warn(`Swap failed for token ${token.address}`);
                }
            }

            callback?.({
                text: `Swapped ${dustTokens.length} dust token(s) into ETH (~$${totalUsdValue}).`,
            });
        } catch (error) {
            console.error("Error dusting wallet:", error);
            callback?.({
                text: "An error occurred while dusting your wallet. Please try again later.",
            });
        }
    },
};
