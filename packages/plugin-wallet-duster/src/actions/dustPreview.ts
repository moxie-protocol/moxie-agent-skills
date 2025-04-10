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
import { Portfolio } from "@moxie-protocol/moxie-agent-lib";
import { DustRequestSchema } from "../types";
import { dustRequestTemplate } from "../templates";
import { ETH_ADDRESS } from "../constants/constants";

export const previewDustAction: Action = {
    name: "PREVIEW_DUST_TOKENS",
    similes: [
        "PREVIEW_DUST",
        "SHOW_DUST_TOKENS",
        "WHAT_TOKENS_WILL_BE_DUSTED",
        "LIST_LOW_VALUE_TOKENS",
        "SHOW_TOKENS_BELOW_USD",
        "SHOW_TOKENS_BELOW_VALUE",
        "SHOW_TOKENS_BELOW_THRESHOLD",
        "DUST_PREVIEW",
    ],
    description:
        "Preview/Show what dust or low-value tokens would be dusted based on USD threshold given by user. By default, the threshold is $5.",
    validate: async () => true,
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Preview what tokens you’d dust from my wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me all the dust tokens I have in my wallets?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What tokens will be dusted from my wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me all the dust tokens I have in my wallets?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me all the low-value tokens in my wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me all the dust tokens below $10 in my wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
                },
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
                content: {
                    text: "Show me the all the dust tokens in my wallet.",
                },
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
            elizaLogger.log("Providing preview of dust in user's wallet");

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
            const { tokenBalances }: Portfolio =
                (state.agentWalletBalance as Portfolio) ?? {
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
                return callback?.({
                    text: `No tokens under $${threshold} found in your wallet.${threshold > 0.01 ? `\n\nOnly tokens above $0.01 have been shown. To show dust tokens below $0.01, set the threshold to $0.01 or below.` : ""}`,
                });
            }

            const totalUsdValue = dustTokens.reduce(
                (sum, token) => sum + token.token.balanceUSD,
                0
            );

            const lines = dustTokens.map(
                (t) =>
                    `| $${t.token.baseToken.symbol} | [${t.token.baseToken.address}](https://basescan.org/token/${t.token.baseToken.address}) | ${t.token.balanceUSD < 0.01 ? "< $0.01" : `$${t.token.balanceUSD.toFixed(2)}`} |`
            );
            const response = `You have ${dustTokens.length} dust token(s) totaling ${totalUsdValue < 0.01 ? "< $0.01" : `~ $${totalUsdValue.toFixed(2)}`}:\n| Token Symbol | Token Address | Value |\n|-------|-------|-------|\n${lines.join("\n")}${threshold > 0.01 ? `\n\nOnly tokens above $0.01 have been displayed. To display tokens below $0.01, set the threshold to $0.01 or below.` : ""}`;

            return callback?.({ text: response });
        } catch (error) {
            elizaLogger.error("Error previewing dust:", error);
            return callback?.({
                text: "An error occurred while previewing dust. Please try again later.",
            });
        }
    },
};

export default previewDustAction;
