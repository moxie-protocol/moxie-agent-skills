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
} from "@moxie-protocol/core";

import { moxieUserService } from "@moxie-protocol/moxie-lib";
import * as templates from "../templates";
import { getMoxieIdsFromMessage, streamTextByLines } from "./utils";
import { FIVE_MINS, getTweetsCacheKey, ONE_HOUR } from "../cache";
import { Tweet } from "agent-twitter-client";

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

export async function fetchTweetsByMoxieUserIds(
    userIdToTwitterUsernames: Map<string, string>,
    runtime: IAgentRuntime
) {
    await twitterService.initialize();
    const maxTweetsPerUser = 40;

    const tweetPromises = Array.from(userIdToTwitterUsernames.entries()).map(
        async ([moxieId, twitterHandle]) => {
            try {
                const cachedTweets = await runtime.cacheManager.get(
                    getTweetsCacheKey(moxieId)
                );
                if (cachedTweets) {
                    elizaLogger.debug(`using cached tweets for ${moxieId}`);
                    return {
                        moxieId,
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
                    getTweetsCacheKey(moxieId),
                    JSON.stringify(tweets),
                    {
                        // Cache tweets for 5 minutes (60 seconds * 5)
                        expires: Date.now() + ONE_HOUR,
                    }
                );
                elizaLogger.debug(`cached tweets for ${moxieId}`);
                return {
                    moxieId,
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
    const moxieIds: string[] = await getMoxieIdsFromMessage(
        message,
        templates.topCreatorsTwitterExamples,
        state,
        runtime
    );
    elizaLogger.debug(`searching for tweets for moxieIds: ${moxieIds}`);
    if (moxieIds.length === 0) {
        callback({
            text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
        });
        return null;
    }
    // Get Twitter usernames for all Moxie IDs
    const socialProfiles =
        await moxieUserService.getSocialProfilesByMoxieIdMultiple(moxieIds);
    const userIdToTwitterUsernames = new Map<string, string>();
    const userIdToFarcasterUsernames = new Map<string, string>();
    socialProfiles.forEach((profile, userId) => {
        if (profile.twitterUsername) {
            userIdToTwitterUsernames.set(userId, profile.twitterUsername);
        }
        if (profile.farcasterUsername) {
            userIdToFarcasterUsernames.set(userId, profile.farcasterUsername);
        }
    });

    if (userIdToTwitterUsernames.size === 0) {
        callback({
            text: "I couldn't find any Twitter accounts linked to these Moxie users",
        });
        return null;
    }

    const allTweets = await fetchTweetsByMoxieUserIds(
        userIdToTwitterUsernames,
        runtime
    );

    if (allTweets.length === 0) {
        callback({
            text: "I couldn't fetch any tweets from the associated Twitter accounts.",
        });
        return null;
    }

    return allTweets;
}

export const creatorTweetSummary: Action = {
    name: "TWEET_SUMMARY",
    suppressInitialMessage: true,
    similes: ["TWEET_HISTORY", "TWITTER_ACTIVITY", "TWITTER_UPDATES"],
    description:
        "This action fetches and summarizes recent tweets and Twitter activities of users",
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
        const allTweets = await fetchAndValidateTweets(
            message,
            state,
            callback,
            runtime
        );

        const newstate = await runtime.composeState(message, {
            tweets: JSON.stringify(allTweets),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
        });
        // Create a summary context for the model
        const context = composeContext({
            state: newstate,
            template: templates.tweetSummary,
        });

        // Generate summary using the model
        const summaryStream = streamText({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        await streamTextByLines(summaryStream, (text: string) => {
            callback({ text });
        });
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
