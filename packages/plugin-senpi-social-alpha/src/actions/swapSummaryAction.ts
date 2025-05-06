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
    ModelProviderName,
    stringToUuid,
} from "@senpi-ai/core";

import * as templates from "../templates";
import { fetchSwapData } from "../utils";
import { TOP_CREATORS_COUNT } from "../config";
import {
    getSenpiIdsFromMessage,
    streamTextByLines,
    handleIneligibleSenpiUsers,
} from "./utils";
import {
    getTokenDetails,
    getTrendingTokenDetails,
    SenpiAgentDBAdapter,
    SenpiUser,
    senpiUserService,
} from "@senpi-ai/senpi-agent-lib";
export const tokenSwapSummary: Action = {
    name: "TRENDING_TOKENS",
    suppressInitialMessage: true,
    similes: [
        "TOKEN_PURCHASES",
        "TOKEN_RECOMMENDATIONS",
        "BUY_RECOMMENDATIONS",
        "TRENDING_CRYPTOCURRENCIES",
        "TOKEN_SWAP_SUMMARIES",
    ],
    description:
        "Provides insights into recent trading and swapping activities on Base, covering ERC20 tokens. This action highlights trending tokens, popular swaps/trades, and individual user activity. It can fetch and summarize purchase & swapping data for multiple users upon request.",
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
            "NON_CREATOR_COIN"
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

        [
            {
                user: "user",
                content: {
                    text: "betashop's swaps",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through their recent transactions. Here's a summary:\n\nVitalik Buterin (@VitalikButerin) has been buying $ETH and $MATIC. His most recent purchase was 100 $ETH.\n\nBalaji (@balajis) has been buying $SOL and $FTM. He's also been swapping $BTC for $ETH.\n\nWould you like me to suggest a token to buy based on their recent activity?",
                },
            },
        ],

        [
            {
                user: "user",
                content: {
                    text: "Give me @[betashop|M4]'s token swaps",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll check dickybima's recent token swap transactions and provide a summary:\n\nLooking at dickybima's recent activity, they've been actively trading tokens. Here are their recent swaps:\n\n- Bought 0.5 $ETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2)\n- Swapped some $USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) for $MATIC (0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0)\n\nWould you like me to help you swap any of these tokens? I can assist you with the purchase process.",
                },
            },
        ],
    ],
};

export const creatorCoinSwapSummary: Action = {
    name: "TRENDING_CREATOR_COINS",
    suppressInitialMessage: true,
    similes: [
        "CREATOR_COIN_PURCHASES",
        "CREATOR_COIN_RECOMMENDATIONS",
        "CREATOR_COIN_BUY_RECOMMENDATIONS",
        "CREATOR_COIN_TRENDING_CRYPTOCURRENCIES",
        "CREATOR_COIN_SWAP_SUMMARIES",
    ],
    description:
        "Retrieves insights on trending swaps of creator coins only. Use when users explicitly request details on creator coins.",
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
            "CREATOR_COIN"
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

        [
            {
                user: "user",
                content: {
                    text: "betashop.eth's creator coin swaps",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through betashop.eth's recent creator coin transactions. Here's a summary:\n\nbetashop.eth has been actively trading creator coins. They recently purchased $VITALIK (0x1234...abcd) and $BALAJI (0x5678...efgh) creator coins. They also bought some $RACER (0x91011...ijkl) tokens.\n\nWould you like me to help you swap any of these creator coins? I can assist you with the purchase process.",
                },
            },
        ],

        [
            {
                user: "user",
                content: {
                    text: "Give me @[betashop|M4]'s creator coin swaps",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll check betashop's recent creator coin swap transactions and provide a summary:\n\nLooking at betashop's recent activity, they've been actively trading creator coins. Here are their recent swaps:\n\n- Bought $VITALIK (0x1234...abcd)\n- Swapped some $BALAJI (0x5678...efgh) for $RACER (0x91011...ijkl)\n\nWould you like me to help you swap any of these creator coins? I can assist you with the purchase process.",
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
    tokenType: "ALL" | "CREATOR_COIN" | "NON_CREATOR_COIN" = "ALL"
) {
    elizaLogger.debug(`== in summary handler ==`);
    const context = composeContext({
        state: {
            ...state,
            message: message.content.text,
            currentDate: new Date()
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
        },
        template: templates.swapSummaryInputContextExtraction,
    });

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    const responseJson = parseJSONObjectFromText(response);
    if (!responseJson) {
        callback({
            text: "I couldn't understand your request. Please try again.",
        });
        return false;
    }

    const {
        isGeneralQuery,
        selfQuery,
        onlyIncludeSpecifiedSenpiIds,
        isTopTokenOwnersQuery,
        timeFilter,
    } = responseJson;

    elizaLogger.debug(
        `--- >> isGeneralQuery: ${isGeneralQuery}, selfQuery: ${selfQuery}, onlyIncludeSpecifiedSenpiIds: ${onlyIncludeSpecifiedSenpiIds}, isTopTokenOwnersQuery: ${isTopTokenOwnersQuery}, timeFilter: ${timeFilter}`
    );

    let senpiIds: string[] = [];
    if (!isGeneralQuery) {
        try {
            if (selfQuery === true) {
                const senpiUserId = (state.senpiUserInfo as SenpiUser)?.id;
                senpiIds = [senpiUserId];
            } else {
                senpiIds = await getSenpiIdsFromMessage(
                    message,
                    templates.topCreatorsSwapExamples,
                    state,
                    runtime,
                    isTopTokenOwnersQuery,
                    TOP_CREATORS_COUNT
                );
            }

            if (senpiIds.length === 0) {
                callback({
                    text: "I couldn't find the specific creators you mentioned. Please make sure to mention their names or usernames (using '@').",
                });
                return false;
            }
        } catch (error) {
            // check if error is invalid mention format
            if (
                error instanceof Error &&
                error.message ===
                    "Invalid mention format. Please use format: @[name|MID]"
            ) {
                const errorResponse = {
                    text: `Invalid mention format. Please use format: @[name|MID]`,
                    content: {
                        success: false,
                        error: {
                            code: "INVALID_MENTION_FORMAT",
                            message:
                                "Invalid mention format. Please use format: @[name|MID]",
                        },
                        metadata: {
                            timestamp: new Date().toISOString(),
                            source: "senpi-big-fan-plugin",
                            action: "getSenpiIdsFromMessage",
                            version: "1.0.0",
                        },
                    },
                };

                callback(errorResponse);
                return false;
            }
            throw error;
        }
    }
    elizaLogger.debug(
        `searching for swaps for senpiIds: ${senpiIds} - ${isGeneralQuery}`
    );
    let newstate;
    let totalFreeQueries;
    let usedFreeQueries;
    let eligibleSenpiIds: string[] = [],
        ineligibleSenpiUsers = [];

    if (!isGeneralQuery) {
        let userInfoBatchOutput;
        try {
            userInfoBatchOutput =
                await senpiUserService.getUserBySenpiIdMultipleTokenGate(
                    senpiIds,
                    state.authorizationHeader as string,
                    stringToUuid("SOCIAL_ALPHA")
                );
        } catch (error) {
            elizaLogger.error(
                "Error fetching user info batch:",
                error instanceof Error ? error.stack : error
            );
            await callback({
                text: "There was an error processing your request. Please try again later.",
                action: "SWAP_SUMMARY_ERROR",
            });
            return false;
        }
        totalFreeQueries = userInfoBatchOutput.freeTrialLimit;
        usedFreeQueries =
            userInfoBatchOutput.freeTrialLimit -
            userInfoBatchOutput.remainingFreeTrialCount;
        for (const userInfo of userInfoBatchOutput.users) {
            if (userInfo.errorDetails) {
                ineligibleSenpiUsers.push(userInfo.errorDetails);
            } else {
                eligibleSenpiIds.push(userInfo.user.id);
            }
        }

        elizaLogger.debug(
            `eligibleSenpiIds: ${eligibleSenpiIds}, ineligibleSenpiUsers: ${ineligibleSenpiUsers}`
        );

        if (ineligibleSenpiUsers.length >= 0 && eligibleSenpiIds.length == 0) {
            await handleIneligibleSenpiUsers(ineligibleSenpiUsers, callback);
            return false;
        }
    } else {
        eligibleSenpiIds = senpiIds;
    }

    const allSwaps = await fetchSwapData(
        eligibleSenpiIds,
        tokenType,
        onlyIncludeSpecifiedSenpiIds,
        timeFilter
    );

    if (allSwaps.length === 0) {
        if (eligibleSenpiIds.length <= 3) {
            const userProfiles = [];
            let userProfilesOutput;
            try {
                userProfilesOutput =
                    await senpiUserService.getUserBySenpiIdMultipleTokenGate(
                        eligibleSenpiIds,
                        state.authorizationHeader as string,
                        stringToUuid("SOCIAL_ALPHA")
                    );
            } catch (error) {
                elizaLogger.error(
                    "Error fetching user info batch:",
                    error instanceof Error ? error.stack : error
                );
                await callback({
                    text: "There was an error processing your request. Please try again later.",
                    action: "SWAP_SUMMARY_ERROR",
                });
                return false;
            }
            for (const userInfo of userProfilesOutput.users) {
                if (userInfo.user) {
                    userProfiles.push(userInfo.user);
                }
            }
            const totalWallets = Array.from(userProfiles.values()).reduce(
                (sum, profile) => sum + profile.wallets.length,
                0
            );
            const userLinks = Array.from(userProfiles.values())
                .map(
                    (profile) =>
                        `[@${profile.userName}](https://senpi.ai/profile/${profile.id})`
                )
                .join(", ");
            callback({
                text: `I scanned ${totalWallets} wallets for ${userLinks} and I was not able to find any recent trades. Do you want to analyze their portfolio?`,
            });
            return false;
        } else {
            callback({
                text: `I scanned various wallets for ${eligibleSenpiIds.length} users or the creators and I was not able to find any recent trades. Do you want to analyze their portfolio?`,
            });
            return false;
        }
    }

    const tokenAddresses = allSwaps.map((swap) => swap.token_address);

    elizaLogger.debug(`tokenAddresses: ${tokenAddresses}`);

    let tokenDetails = await getTokenDetails(tokenAddresses);

    if (tokenType === "NON_CREATOR_COIN") {
        tokenDetails = await getTrendingTokenDetails(tokenAddresses);
    }

    elizaLogger.debug(`tokenDetails: ${JSON.stringify(tokenDetails)}`);

    const memoryObj = await runtime.messageManager.getMemories({
        roomId: message.roomId,
        count: 20,
        unique: true,
    });

    const formattedHistory = memoryObj.map((memory) => {
        const role = memory.userId === runtime.agentId ? "Assistant" : "User";
        return `${role}: ${memory.content.text}`;
    });
    const memoryContents = formattedHistory.reverse().slice(-4);

    newstate = await runtime.composeState(message, {
        swaps: JSON.stringify(allSwaps),
        tokenDetails: JSON.stringify(tokenDetails),
        totalFreeQueries: totalFreeQueries,
        usedFreeQueries: usedFreeQueries,
        ineligibleSenpiUsers: JSON.stringify(ineligibleSenpiUsers),
        message: message.content.text,
        previousConversations: memoryContents.length > 1 ? memoryContents : "",
    });

    // Create a summary context for the model
    let swapSummaryContext;
    if (tokenType === "CREATOR_COIN") {
        swapSummaryContext = composeContext({
            state: newstate,
            template: templates.getCreatorCoinSummaryPrompt(false),
        });
    } else if (tokenType === "NON_CREATOR_COIN") {
        swapSummaryContext = composeContext({
            state: newstate,
            template: templates.getNonCreatorCoinSummaryPrompt(false),
        });
    } else {
        callback({
            text: "I couldn't understand your request. Please try again.",
        });
        return false;
    }

    // Generate summary using the model
    const summaryStream = streamText({
        runtime,
        context: swapSummaryContext,
        modelClass: ModelClass.LARGE,
        modelConfigOptions: {
            modelProvider: ModelProviderName.OPENAI,
            temperature: 1.0,
            apiKey: process.env.OPENAI_API_KEY!,
            modelClass: ModelClass.LARGE,
        },
    });

    // await streamTextByLines(summaryStream, (text: string) => {
    //     callback({ text });
    // });

    for await (const textPart of summaryStream) {
        callback({ text: textPart });
    }

    if (ineligibleSenpiUsers.length > 0) {
        handleIneligibleSenpiUsers(ineligibleSenpiUsers, callback);
    }
    // const summary = await generateText({
    //     runtime,
    //     context: swapSummaryContext,
    //     modelClass: ModelClass
    //         .LARGE,
    // });

    // elizaLogger.success(`swapSummary: ${summary}`);

    // await callback({ text: response });

    return true;
}
