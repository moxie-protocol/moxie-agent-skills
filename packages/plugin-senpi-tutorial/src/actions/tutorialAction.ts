import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    composeContext,
    ModelClass,
    elizaLogger,
    generateText,
} from "@moxie-protocol/core";
import { tutorialTemplate } from "../templates";

export const tutorialAction: Action = {
    name: "TUTORIAL_YOUTUBE_HELP_SENPI",
    similes: [
        "TUTORIAL_TO_USE_SENPI",
        "TUTORIAL_TO_GET_STARTED_WITH_SENPI",
        "TUTORIAL_TO_DO_TOKEN_RESEARCH_WITH_SENPI",
        "TUTORIAL_TO_SETUP_A_LIMIT_ORDER_WITH_SENPI",
        "TUTORIAL_TO_SETUP_AN_AUTONOMOUS_TRADE_WITH_SENPI",
        "TUTORIAL_TO_AUTOMATE_TRADES_WITH_SENPI",
    ],
    description: "Provide users with tutorials to use Senpi",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const context = composeContext({
                state,
                template: tutorialTemplate,
            });

            const text = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });
            callback?.({
                text,
            });
            return true;
        } catch (e) {
            elizaLogger.error(e);
            callback?.({
                text: "Sorry, looks like I'm having trouble finding the tutorial you're looking for. Please try again later.",
            });
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you provide me with a tutorial to get started with Senpi?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Here's a tutorial for you: https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    action: "TUTORIAL_YOUTUBE_HELP_SENPI",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Is there a tutorial to setup a limit order?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To setup a limit order, here's a tutorial for you: https://youtu.be/uElZko09rOg?si=BP4NYWgKm5MUHqV0x",
                    action: "TUTORIAL_YOUTUBE_HELP_SENPI",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Is there a tutorial to setup an autonomous trade?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To setup an autonomous trade, here's a tutorial for you: https://youtu.be/uElZko09rOg?si=BP4NYWgKm5MUHqV0x",
                    action: "TUTORIAL_YOUTUBE_HELP_SENPI",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I'd like to research tokens, can you provide me a tutorial for this?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "To research tokens, here's a tutorial for you: https://youtu.be/VigFMPzPmjQ?si=cAtVfHt-RrC86eKs",
                    action: "TUTORIAL_YOUTUBE_HELP_SENPI",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "can you give me tutorials on how to use the skills on Senpi?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sorry, I don't have any tutorials for that request. Please try again later.",
                    action: "TUTORIAL_YOUTUBE_HELP_SENPI",
                },
            },
        ],
    ] as ActionExample[][],
};
