import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";

export const learnSenpiAction: Action = {
    name: "LEARN_SENPI",
    similes: [
        "LEARN_SENPI",
        "LEARN_SENPI_TUTORIAL",
        "LEARN_SENPI_TUTORIALS",
        "LEARN_SENPI_TUTORIAL_FOR_SENPI",
        "WHAT_TUTORIALS_ARE_AVAILABLE_FOR_SENPI",
        "MENTION_ALL_TUTORIALS_FOR_SENPI",
        "LIST_ALL_TUTORIALS_FOR_SENPI",
        "LIST_ALL_AVAILABLE_TUTORIALS_FOR_SENPI",
        "LIST_ALL_AVAILABLE_TUTORIAL_HELP_SENPI",
    ],
    description: "Learn how to use Senpi complete with all the tutorials",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        callback({
            text: `Welcome to Senpi, your onchainGPT built for autonomous crypto trading. Senpi identifies market opportunities, executes trades based on your strategies, and operates reliably around the clock—so you never miss a market move.

Ready to level up? Quickly master Senpi with these essential videos:
- Getting Started with Senpi: [Watch Now](${process.env.GET_STARTED_TUTORIAL_URL})
- Setting Up Your First Autonomous Trade: [Watch Now](${process.env.AUTONOMOUS_TRADE_TUTORIAL_URL})
- Token Research with Senpi: [Watch Now](${process.env.TOKEN_RESEARCH_TUTORIAL_URL})
- Executing Limit Orders with Senpi: [Watch Now](${process.env.LIMIT_ORDER_TUTORIAL_URL})

And don’t forget to join The Dojo! Our official Senpi Telegram group ([Join Now](${process.env.SENPI_TELEGRAM_GROUP_URL})) to ask questions, get insider alpha, share feedback, and chat directly with our team 🥷.

<iframe src="${process.env.GET_STARTED_TUTORIAL_URL_EMBED}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`,
        });
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Learn Senpi",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are all the tutorials for Senpi: [Watch Now](${process.env.GET_STARTED_SENPI_YOUTUBE_URL})",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you list all the tutorials for Senpi?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here are all the tutorials for Senpi: [Watch Now](${process.env.GET_STARTED_SENPI_YOUTUBE_URL})",
                },
            },
        ],
    ] as ActionExample[][],
};
