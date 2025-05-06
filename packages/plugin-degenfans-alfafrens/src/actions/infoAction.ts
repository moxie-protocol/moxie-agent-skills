import { ModelClass } from "@senpi-ai/core";
import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    composeContext,
    generateText,
} from "@senpi-ai/core";
import { infoTextTemplate } from "../templates";

export const infoAction: Action = {
    name: "DEGENFANS_ALFAFRENS_INFO",
    similes: [
        "WHAT_IS_DEGENFANS_ALFAFRENS",
        "HOW_DOES_DEGENFANS_ALFAFRENS_WORK",
        "HOW_TO_USE_DEGENFANS_ALFAFRENS",
    ],
    description: "Answer questions on what is the Degenfans Alfafrens skills.",
    suppressInitialMessage: true,
    validate: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State
    ) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        const pluginHelp = {
            title: "DegenFans AlfaFrens Plugin",
            description: `
              This plugin helps you discover the best staking options on **AlfaFrens**.
              AlfaFrens is a **SocialFi** platform where you can subscribe to channels,
              get access to token-gated chats, and earn **AF Tokens**.

              Once you have **AF Tokens**, you can stake them on various channels and receive a portion of the channel's subscription income as a reward.
              This plugin helps you find the optimal staking options for a given amount of **AF Tokens**.
            `,
            usage: `
            ##AlfaFrens explained
              1. **Subscribe to a channel**: Join any channel on **AlfaFrens** to get started.
              2. **Get your AF Tokens**: Earn **AF Tokens** by participating in the channel's token-gated chat.
              3. **Use this plugin**: Input your available **AF Tokens** into the plugin to explore the best staking options.
              4. **Stake AF Tokens**: Choose the channel that gives you the best return for staking your tokens and start earning part of the subscription income.
            `,
            features: `
              ##features
              **Find the best staking opportunities**: Get suggestions for channels with the highest potential returns based on your **AF Tokens**.
              - If you have e.g. **100 AF Tokens**, this plugin will help you compare the staking rewards of multiple channels and suggest the one that offers the best return for your tokens.
              **Maximize your earnings**: Make informed decisions to stake in channels that offer the most subscription income in return.
              **Easy-to-use interface**: Simply enter your **AF Tokens** to see potential staking options.
            `,
            tips: `
              ##general staking tips
              - Always consider the **channel's performance** and community size before staking.
              - **AF Token value** may fluctuate, so stay updated on market trends to ensure the best staking returns.
            `,
            exampleUsage: `
              ##example Senpi AI prompts
              - I want to stake 50000 AF
              - I (<AlfaFrens profile Address>) want to stake 150000 AF
              - I (<AlfaFrens username>) want to stake 150000 AF
              - I want to stake 9000 AF at my existing stakes
              - I want to stake 9000 AF at my active subscriptions
              - I want to stake 9000 AF at my existing stakes and subscriptions
              - I want to stake 4600 AF on channels with minimum 10 subscriptions
            `,
        };

        const mdResponse =
            pluginHelp.title +
            "\n" +
            pluginHelp.description +
            "\n" +
            pluginHelp.usage +
            "\n" +
            pluginHelp.features +
            "\n" +
            pluginHelp.tips +
            "\n" +
            pluginHelp.exampleUsage;

        const context = composeContext({
            state: {
                ...state,
                infoText: mdResponse,
            },
            template: infoTextTemplate,
        });

        const response = await generateText({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });
        await callback({
            text: response,
            action: "DEGENFANS_ALFAFRENS_INFO",
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is Degenfans Alfafrens Skills?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Degenfans Alfafrens is ...",
                },
            },
        ],
    ] as ActionExample[][],
};
