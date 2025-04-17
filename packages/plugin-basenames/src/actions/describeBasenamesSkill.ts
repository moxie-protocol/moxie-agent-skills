import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";

const describeBasenamesSkillAction: Action = {
    name: "DESCRIBE_BASENAMES_SKILL",
    similes: ["WHAT_IS_BASENAMES", "EXPLAIN_BASENAMES", "ABOUT_BASENAMES"],
    description:
        "Provides a detailed description of what the Basenames skill can do.",
    validate: async () => true,
    examples: [
        [
            {
                user: "{{user}}",
                content: { text: "What can I do with the Basenames skill?" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "The Basenames skill lets you easily manage your Basenames—view what you own, check if a Basename is available, and register new Basenames directly through natural language commands.",
                },
            },
        ],
    ],
    suppressInitialMessage: true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        const description = `
The Basenames skill makes managing your Basenames easy and intuitive. With this skill, you can:
- **View Owned Basenames**: Quickly see all your Basenames across your connected wallets, displayed clearly with their expiry dates.
- **Check Availability**: Effortlessly check if a desired Basename is available for registration.
- **Register Basenames**: If a Basename is available, see the cost upfront and register it directly, using simple confirmation prompts and secure transactions via your embedded wallet.
Just ask naturally—I'm here to help manage your Basenames smoothly!
    `;
        await callback?.({ text: description.trim() }); // Changed: explicit output field
    },
};

export default describeBasenamesSkillAction;
