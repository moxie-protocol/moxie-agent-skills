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
        "SHOW_DUST_SWAP_PREVIEW",
        "LIST_LOW_VALUE_TOKENS",
        "SHOW_TOKENS_BELOW_USD",
        "SHOW_TOKENS_BELOW_VALUE",
        "SHOW_TOKENS_BELOW_THRESHOLD",
        "DUST_PREVIEW",
    ],
    description: "Preview what tokens would be dusted based on USD threshold.",
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
                    text: "Can you show me all the tokens below $10 in my wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `You have 3 dust token(s) totaling ~$7.85:\n- USDC: ~$2.50\n- PEPE: ~$1.15\n- DINO: ~$4.20`,
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
            elizaLogger.log("tokenBalances", tokenBalances);
            const dustTokens = tokenBalances.filter(
                (t) =>
                    t.token.balanceUSD < threshold &&
                    t.token.balance > 0 &&
                    // ignore ETH
                    t.address !== ETH_ADDRESS.toLowerCase()
            );

            if (!dustTokens.length) {
                return callback?.({
                    text: `No tokens under $${threshold} found in your wallet.`,
                });
            }

            const totalUsdValue = dustTokens
                .reduce((sum, token) => sum + token.token.balanceUSD, 0)
                .toFixed(2);

            const lines = dustTokens.map(
                (t) =>
                    `| ${t.token.baseToken.symbol ?? t.address} | $${t.token.balanceUSD.toFixed(2)} |`
            );
            const response = `You have ${dustTokens.length} dust token(s) totaling ~$${totalUsdValue}:\n| Token | Value |\n|-------|-------|\n${lines.join("\n")}`;

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
