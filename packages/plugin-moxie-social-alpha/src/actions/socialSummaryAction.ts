import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    composeContext,
    generateText,
    streamText,
    ModelProviderName,
    stringToUuid,
    parseJSONObjectFromText,
} from "@moxie-protocol/core";
import { moxieUserService, MoxieAgentDBAdapter, MoxieUser } from "@moxie-protocol/moxie-agent-lib";
import { fetchFarcasterCastsByMoxieUserIds } from "./farcasterSummaryAction";
import { fetchTweetsByMoxieUserIds } from "./twitterSummaryAction";
import * as templates from "../templates";
import { TOP_CREATORS_COUNT } from "../config";
import { getEligibleMoxieIds, getMoxieIdsFromMessage, streamTextByLines, handleIneligibleMoxieUsers } from "./utils";

export const creatorSocialSummary: Action = {
    name: "SOCIAL_SUMMARY",
    suppressInitialMessage: true,
    similes: [
        "FARCASTER_AND_TWITTER_SUMMARY",
        "FARCASTER_AND_TWITTER_ACTIVITY",
        "FARCASTER_AND_TWITTER_UPDATES",
        "SOCIAL_POSTS",
    ],
    description:
        "Summarizes recent posts and news from both Farcaster and Twitter/X. Use this when no specific platform is mentioned, or when the request references both Farcaster and Twitter/X together. Can also be used when the user is asking for general news.",
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

        const context = composeContext({
            state: {
                ...state,
                message: message.content.text,
                currentDate: new Date().toISOString().replace('T', ' ').substring(0, 19),
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
            return false;
        }

        const {
            isTopTokenOwnersQuery,
        } = responseJson;


        const moxieIds: string[] = await getMoxieIdsFromMessage(
            message,
            templates.socialSummaryExamples,
            state,
            runtime,
            isTopTokenOwnersQuery,
            TOP_CREATORS_COUNT,
        );
        elizaLogger.debug(
            `searching for social posts for moxieIds: ${moxieIds}`
        );
        // if (moxieIds.length === 0) {
        //     callback({
        //         text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
        //     });
        //     return false;
        // }
        const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;

        await (runtime.databaseAdapter as MoxieAgentDBAdapter).getFreeTrailBalance(moxieUserInfo.id, stringToUuid("SOCIAL_ALPHA"));
        const { total_free_queries, remaining_free_queries: new_remaining_free_queries } = await (runtime.databaseAdapter as MoxieAgentDBAdapter).deductFreeTrail(moxieUserInfo.id, stringToUuid("SOCIAL_ALPHA"));

        elizaLogger.debug(`total_free_queries: ${total_free_queries}, new_remaining_free_queries: ${new_remaining_free_queries}`);
        const { eligibleMoxieIds, ineligibleMoxieUsers } = await getEligibleMoxieIds(moxieUserInfo, new_remaining_free_queries, moxieIds);

        elizaLogger.debug(`eligibleMoxieIds: ${eligibleMoxieIds}, ineligibleMoxieUsers: ${ineligibleMoxieUsers}`);

        if (ineligibleMoxieUsers.length > 0 && eligibleMoxieIds.length == 0) {
            await handleIneligibleMoxieUsers(ineligibleMoxieUsers, callback);
            return false;
        }

        if (eligibleMoxieIds.length === 0 && moxieIds.length === 0) {
            callback({
                text: "I couldn't find your favorite creators. Please make sure to mention their names or usernames (using '@').",
            });
            return false;
        }

        const socialProfiles =
            await moxieUserService.getSocialProfilesByMoxieIdMultiple(eligibleMoxieIds);
        const userIdToTwitterUsernames = new Map<string, string>();
        const userIdToFarcasterUser = new Map<
            string,
            { userName: string; userId: string }
        >();
        socialProfiles.forEach((profile, userId) => {
            if (profile.twitterUsername) {
                userIdToTwitterUsernames.set(userId, profile.twitterUsername);
            }
            if (profile.farcasterUsername) {
                userIdToFarcasterUser.set(userId, {
                    userName: profile.farcasterUsername,
                    userId: profile.farcasterUserId,
                });
            }
        });

        const promises = [];
        if (userIdToFarcasterUser.size > 0) {
            promises.push(
                fetchFarcasterCastsByMoxieUserIds(userIdToFarcasterUser, runtime, 10)
            );
        }

        if (userIdToTwitterUsernames.size > 0) {
            promises.push(
                fetchTweetsByMoxieUserIds(userIdToTwitterUsernames, runtime, 10)
            );
        }

        const results = await Promise.all(promises);

        console.log({ results: JSON.stringify(results) });
        const farcasterPosts = results[0];
        const twitterPosts = results[1];

        const displayFreeQueriesHeader = Number(total_free_queries) - Number(new_remaining_free_queries) < Number(total_free_queries);

        const newstate = await runtime.composeState(message, {
            twitterPosts: JSON.stringify(twitterPosts),
            farcasterPosts: JSON.stringify(farcasterPosts),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
            totalFreeQueries: total_free_queries,
            usedFreeQueries: Number(total_free_queries) - Number(new_remaining_free_queries),
            displayFreeQueriesHeader: displayFreeQueriesHeader,
            topCreatorsCount: TOP_CREATORS_COUNT,
            ineligibleMoxieUsers: JSON.stringify(ineligibleMoxieUsers),
        });

        const newContext = composeContext({
            state: newstate,
            template: templates.getSocialSummaryPrompt(displayFreeQueriesHeader),
        });

        const summaryStream = streamText({
            runtime,
            context: newContext,
            modelClass: ModelClass.LARGE,
            modelConfigOptions: {
                modelProvider: ModelProviderName.OPENAI,
                temperature: 1.0,
                apiKey: process.env.OPENAI_API_KEY!,
                modelClass: ModelClass.LARGE
            }
        });

        // await streamTextByLines(summaryStream, (text: string) => {
        //     callback({ text });
        // });

        for await (const textPart of summaryStream) {
            callback({ text: textPart });
        }

        if (ineligibleMoxieUsers.length > 0) {
            handleIneligibleMoxieUsers(ineligibleMoxieUsers, callback, true);
        }

        // const summary = await generateText({
        //     runtime,
        //     context: context,
        //     modelClass: ModelClass.LARGE,
        // });

        // elizaLogger.success(`swapSummary: ${summary}`);

        // await callback({ text: summary });


        return true;
    },
    examples: [
        [
            {
                user: "user",
                content: {
                    text: "Can you give me a summary of what my favorite creators have been posting on Farcaster lately?",
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
                    text: "Tell me farcaser summary of VitalikButerin",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "I've looked through their recent farcaster casts. Here's a summary:\n\nVitalik Buterin (@VitalikButerin) has been discussing ZK rollups and posting about Ethereum scaling solutions. His most engaging tweet was about layer 2 adoption metrics.\n\nBalaji (@balajis) shared thoughts on AI governance and posted a thread about network states. He's also been commenting on recent tech industry developments.\n\nWould you like me to focus on any particular creator or topic?",
                },
            },
        ],
    ],
};
