import { twitterService } from "../services/twitterService";
import {
    Action,
    composeContext,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    streamText,
    ModelProviderName,
    stringToUuid,
    parseJSONObjectFromText,
} from "@senpi-ai/core";

import {
    senpiUserService,
    SenpiAgentDBAdapter,
    SenpiUser,
} from "@senpi-ai/senpi-agent-lib";
import * as templates from "../templates";
import {
    getSenpiIdsFromMessage,
    streamTextByLines,
    handleIneligibleSenpiUsers,
} from "./utils";
import { FIVE_MINS, getTweetsCacheKey, ONE_HOUR } from "../cache";
import { Tweet } from "agent-twitter-client";
import { TOP_CREATORS_COUNT } from "../config";
function formatTweets(tweets: Tweet[]) {
    return tweets.map((tweet) => ({
        text: tweet.text,
        timestamp: tweet.timestamp,
        timeParsed: tweet.timeParsed,
        name: tweet.name,
        userName: tweet.username,
        url: tweet.permanentUrl,
        quotedStatus: tweet.quotedStatus
            ? {
                  text: tweet.quotedStatus.text,
                  timestamp: tweet.quotedStatus.timestamp,
                  timeParsed: tweet.quotedStatus.timeParsed,
                  name: tweet.quotedStatus.name,
                  userName: tweet.quotedStatus.username,
              }
            : null,
    }));
}

export async function fetchTweetsBySenpiUserIds(
    userIdToTwitterUsernames: Map<string, string>,
    runtime: IAgentRuntime,
    maxTweetsPerUser: number = 20
) {
    await twitterService.initialize();

    const tweetPromises = Array.from(userIdToTwitterUsernames.entries()).map(
        async ([senpiId, twitterHandle]) => {
            try {
                const cachedTweets = await runtime.cacheManager.get(
                    getTweetsCacheKey(senpiId)
                );
                if (cachedTweets) {
                    elizaLogger.debug(`using cached tweets for ${senpiId}`);
                    return {
                        senpiId,
                        twitterHandle,
                        tweets: formatTweets(
                            JSON.parse(cachedTweets as string)
                        ),
                    };
                }
                const tweets = await twitterService.getTweetsByUser(
                    twitterHandle,
                    maxTweetsPerUser
                );
                elizaLogger.debug(`${twitterHandle} ${tweets.length}}`);

                runtime.cacheManager.set(
                    getTweetsCacheKey(senpiId),
                    JSON.stringify(tweets),
                    {
                        // Cache tweets for 5 minutes (60 seconds * 5)
                        expires: Date.now() + ONE_HOUR,
                    }
                );
                elizaLogger.debug(`cached tweets for ${senpiId}`);
                return {
                    senpiId,
                    twitterHandle,
                    tweets: formatTweets(tweets),
                };
            } catch (error) {
                elizaLogger.error(
                    `Error fetching tweets for ${twitterHandle}:`,
                    error
                );
                return null;
            }
        }
    );

    return (await Promise.all(tweetPromises)).filter(
        (result) => result !== null
    );
}

async function fetchAndValidateTweets(
    message: Memory,
    state: State | undefined,
    callback: HandlerCallback,
    runtime: IAgentRuntime
) {
    const context = composeContext({
        state: {
            ...state,
            message: message.content.text,
            currentDate: new Date()
                .toISOString()
                .replace("T", " ")
                .substring(0, 19),
        },
        template: templates.socialSummaryInputContextExtraction,
    });

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });

    const responseJson = parseJSONObjectFromText(response);
    if (!responseJson) {
        callback({
            text: "I couldn't understand your request. Please try again.",
        });
        return null;
    }

    const { isTopTokenOwnersQuery, selfQuery } = responseJson;

    let senpiIds: string[] = [];
    if (selfQuery === true) {
        const senpiUserId = (state.senpiUserInfo as SenpiUser)?.id;
        senpiIds = [senpiUserId];
    } else {
        senpiIds = await getSenpiIdsFromMessage(
            message,
            templates.topCreatorsTwitterExamples,
            state,
            runtime,
            isTopTokenOwnersQuery,
            TOP_CREATORS_COUNT
        );
    }
    const senpiUserInfo: SenpiUser = state.senpiUserInfo as SenpiUser;

    const ineligibleSenpiUsers = [];
    const eligibleSenpiIds = [];

    // if (senpiIds.length === 0) {
    //     callback({
    //         text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
    //     });
    //     return null;
    // }
    // Get Twitter usernames for all Senpi IDs

    const socialProfiles =
        await senpiUserService.getSocialProfilesBySenpiIdMultiple(
            senpiIds,
            state.authorizationHeader as string,
            stringToUuid("SOCIAL_ALPHA")
        );
    const userIdToTwitterUsernames = new Map<string, string>();
    const userIdToFarcasterUsernames = new Map<string, string>();
    socialProfiles.userIdToSocialProfile.forEach((profile, userId) => {
        if (profile.twitterUsername) {
            userIdToTwitterUsernames.set(userId, profile.twitterUsername);
        }
        if (profile.farcasterUsername) {
            userIdToFarcasterUsernames.set(userId, profile.farcasterUsername);
        }
        eligibleSenpiIds.push(userId);
    });

    socialProfiles.errorDetails.forEach((errorDetails, userId) => {
        if (errorDetails) {
            ineligibleSenpiUsers.push(errorDetails);
        }
    });

    elizaLogger.debug(
        `eligibleSenpiIds: ${eligibleSenpiIds}, ineligibleSenpiUsers: ${ineligibleSenpiUsers}`
    );

    if (ineligibleSenpiUsers.length > 0 && eligibleSenpiIds.length == 0) {
        await handleIneligibleSenpiUsers(ineligibleSenpiUsers, callback);
        return null;
    }

    if (eligibleSenpiIds.length === 0 && senpiIds.length === 0) {
        callback({
            text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
        });
        return null;
    }

    if (userIdToTwitterUsernames.size === 0) {
        callback({
            text: "I couldn't find any Twitter accounts linked to these Senpi users",
        });
        return null;
    }

    const allTweets = await fetchTweetsBySenpiUserIds(
        userIdToTwitterUsernames,
        runtime
    );

    if (allTweets.length === 0) {
        callback({
            text: "I couldn't fetch any tweets from the associated Twitter accounts.",
        });
        return null;
    }

    return {
        allTweets,
        ineligibleSenpiUsers,
        totalFreeQueries: socialProfiles.freeTrialLimit,
        newRemainingFreeQueries: socialProfiles.remainingFreeTrialCount,
    };
}

export const creatorTweetSummary: Action = {
    name: "TWEET_SUMMARY",
    suppressInitialMessage: true,
    similes: ["TWEET_HISTORY", "TWITTER_ACTIVITY", "TWITTER_UPDATES"],
    description:
        "Retrieves and summarizes recent tweets (posts from Twitter/X), highlighting user activity, trending topics, and creator updates. Use this when the request explicitly mentions Twitter or X.",
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
        const senpiUserInfo: SenpiUser = state.senpiUserInfo as SenpiUser;

        const response = await fetchAndValidateTweets(
            message,
            state,
            callback,
            runtime
        );

        if (response === null) {
            return false;
        }

        const {
            allTweets,
            ineligibleSenpiUsers,
            totalFreeQueries,
            newRemainingFreeQueries,
        } = response;

        const displayFreeQueriesHeader =
            Number(totalFreeQueries) - Number(newRemainingFreeQueries) <
            Number(totalFreeQueries);

        const newstate = await runtime.composeState(message, {
            tweets: JSON.stringify(allTweets),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
            totalFreeQueries: totalFreeQueries,
            usedFreeQueries:
                Number(totalFreeQueries) - Number(newRemainingFreeQueries),
            topCreatorsCount: TOP_CREATORS_COUNT,
            displayFreeQueriesHeader: displayFreeQueriesHeader,
            ineligibleSenpiUsers: JSON.stringify(ineligibleSenpiUsers),
        });
        // Create a summary context for the model
        const newContext = composeContext({
            state: newstate,
            template: templates.getTweetSummaryPrompt(displayFreeQueriesHeader),
        });

        // Generate summary using the model
        const summaryStream = streamText({
            runtime,
            context: newContext,
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
            handleIneligibleSenpiUsers(ineligibleSenpiUsers, callback, true);
        }

        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Can you give me a summary of what my favorite creators have been posting on Twitter lately?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I'll check the recent Twitter posts from your favorite creators and summarize them for you.",
                },
            },
        ],

        [
            {
                user: "user",
                content: {
                    text: "Tell me tweet summary of VitalikButerin",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through their recent tweets. Here's a summary:\n\nVitalik Buterin (@VitalikButerin) has been discussing ZK rollups and posting about Ethereum scaling solutions. His most engaging tweet was about layer 2 adoption metrics.\n\nBalaji (@balajis) shared thoughts on AI governance and posted a thread about network states. He's also been commenting on recent tech industry developments.\n\nWould you like me to focus on any particular creator or topic?",
                },
            },
        ],
    ],
};
