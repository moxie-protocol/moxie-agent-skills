import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
} from "@moxie-protocol/core";

export const explainAiDustingAction: Action = {
    name: "EXPLAIN_AI_DUSTING",
    similes: [
        "WHAT_IS_DUSTING",
        "HOW_DOES_AI_DUSTING_WORK",
        "WHAT_DOES_THIS_SKILL_DO",
        "EXPLAIN_DUSTING",
        "WHAT_IS_WALLET_DUSTING",
    ],
    description:
        "Explains how the AI Dusting skill works without performing any swaps.",
    validate: async () => true,
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "How does AI Dusting work?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "AI Dusting automatically scans your wallet for low-value tokens — often called 'dust' — and converts them into ETH...",
                },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state,
        _options,
        callback?: HandlerCallback
    ) => {
        await callback?.({
            text: `AI Dusting automatically scans your wallet for low-value tokens — often called "dust" — and converts them into ETH.

By default, it looks for any tokens worth less than $5 (you can change this). Once it finds them, it uses the 0x API to safely swap those tokens into ETH using your embedded Moxie agent wallet.`,
        });
    },
};
