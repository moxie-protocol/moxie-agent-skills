import {
    Action,
    composeContext,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    parseJSONObjectFromText,
    State,
    streamText,
} from "@elizaos/core";

import * as templates from "../templates";
import { fetchSwapData } from "../utils";
import { getMoxieIdsFromMessage, streamTextByLines } from "./utils";

export const tokenSwapSummary: Action = {
    name: "TRENDING_TOKEN",
    suppressInitialMessage: true,
    similes: [
        "TOKEN_PURCHASE",
        "TOKEN_RECOMMENDATION",
        "BUY_RECOMMENDATION",
        "TRENDING_CRYPTOCURRENCIES",
    ],
    description:
        "This action fetches and summarizes recent token swap done by users",
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        return swapSummaryHandler(
            runtime,
            message,
            state,
            options,
            callback,
            false
        );
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Can you give me a summary of what my favorite creators have been buying lately?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll check the recent onchain transactions from your favorite creators and summarize them for you.",
                },
            },
        ],

        [
            {
                user: "user",
                content: {
                    text: "Tell me what betashop is buyimng",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through their recent transactions. Here's a summary:\n\nVitalik Buterin (@VitalikButerin) has been buying $ETH and $MATIC. His most recent purchase was 100 $ETH.\n\nBalaji (@balajis) has been buying $SOL and $FTM. He's also been swapping $BTC for $ETH.\n\nWould you like me to suggest a token to buy based on their recent activity?",
                },
            },
        ],
    ],
};

export const creatorCoinSwapSummary: Action = {
    name: "TRENDING_CREATOR_COIN",
    suppressInitialMessage: true,
    similes: [
        "CREATOR_COIN_PURCHASE",
        "CREATOR_COIN_RECOMMENDATION",
        "CREATOR_COIN_BUY_RECOMMENDATION",
        "CREATOR_COIN_TRENDING_CRYPTOCURRENCIES",
    ],
    description:
        "This action fetches and summarizes recent creator coin swaps done by users",
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        return swapSummaryHandler(
            runtime,
            message,
            state,
            options,
            callback,
            true
        );
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Can you give me a summary of what creator coins my favorite creators have been buying lately?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll check the recent onchain transactions from your favorite creators and summarize them for you.",
                },
            },
        ],

        [
            {
                user: "user",
                content: {
                    text: "Tell me what creator coins betashop is buying",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through their recent transactions. Here's a summary:\n\nVitalik Buterin (@VitalikButerin) has been buying /yeschef and fid:123. His most recent purchase was 100 $ETH.\n\nBalaji (@balajis) has been buying $SOL and $FTM. He's also been swapping $BTC for $ETH.\n\nWould you like me to suggest a token to buy based on their recent activity?",
                },
            },
        ],
    ],
};

async function swapSummaryHandler(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback,
    fetchOnlyCreatorCoinSwaps: boolean = false
) {

    // if (moxieIds.length === 0) {
    //     callback({
    //         text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
    //     });
    //     return false;
    // }

    // Use model to determine if user is asking about specific creators

    elizaLogger.debug(`== in summary handler ==`);
    const context = composeContext({
        state: {
            ...state,
            message: message.content.text
        },
        template: templates.swapSummaryInputContextExtraction
    });

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.SMALL
    });

    const { isGeneralQuery, onlyIncludeSpecifiedMoxieIds, isTopTokenOwnersQuery, timeFilter } = parseJSONObjectFromText(response);

    elizaLogger.debug(`--- >> isGeneralQuery: ${isGeneralQuery}, onlyIncludeSpecifiedMoxieIds: ${onlyIncludeSpecifiedMoxieIds}, isTopTokenOwnersQuery: ${isTopTokenOwnersQuery}, timeFilter: ${timeFilter}`);


    const moxieIds: string[] = await getMoxieIdsFromMessage(
        message,
        templates.topCreatorsSwapExamples,
        state,
        runtime,
        isTopTokenOwnersQuery,
    );
    elizaLogger.debug(`searching for swaps for moxieIds: ${moxieIds}`);

    if (!isGeneralQuery && moxieIds.length === 0) {
        callback({
            text: "I couldn't find the specific creators you mentioned. Please make sure to mention their names or usernames."
        });
        return false;
    }

    const allSwaps = await fetchSwapData(moxieIds, fetchOnlyCreatorCoinSwaps, onlyIncludeSpecifiedMoxieIds);

    if (allSwaps.length === 0) {
        callback({
            text: "I couldn't fetch any swaps for the associated wallets.",
        });
        return false;
    }

    const newstate = await runtime.composeState(message, {
        swaps: JSON.stringify(allSwaps),
    });
    // Create a summary context for the model
    const swapSummaryContext = composeContext({
        state: newstate,
        template: templates.swapSummary,
    });

    // Generate summary using the model
    const summaryStream = streamText({
        runtime,
        context: swapSummaryContext,
        modelClass: ModelClass.MEDIUM,
    });

    await streamTextByLines(summaryStream, (text: string) => {
        callback({ text });
    });
    return true;
}
