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
} from "@senpi-ai/core";
import {
    senpiUserService,
    SenpiAgentDBAdapter,
    SenpiUser,
} from "@senpi-ai/senpi-agent-lib";
import { fetchFarcasterCastsBySenpiUserIds } from "./farcasterSummaryAction";
import { fetchTweetsBySenpiUserIds } from "./twitterSummaryAction";
import * as templates from "../templates";
import { TOP_CREATORS_COUNT } from "../config";
import {
    getSenpiIdsFromMessage,
    streamTextByLines,
    handleIneligibleSenpiUsers,
} from "./utils";
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
            return false;
        }

        const { isTopTokenOwnersQuery, selfQuery } = responseJson;

        let senpiIds: string[] = [];
        if (selfQuery === true) {
            const senpiUserId = (state.senpiUserInfo as SenpiUser)?.id;
            senpiIds = [senpiUserId];
        } else {
            senpiIds = await getSenpiIdsFromMessage(
                message,
                templates.topCreatorsFarcasterExamples,
                state,
                runtime,
                isTopTokenOwnersQuery,
                TOP_CREATORS_COUNT
            );
        }

        elizaLogger.debug(
            `searching for social posts for senpiIds: ${senpiIds}`
        );
        // if (senpiIds.length === 0) {
        //     callback({
        //         text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
        //     });
        //     return false;
        // }

        const ineligibleSenpiUsers = [];
        const eligibleSenpiIds = [];

        const socialProfiles =
            await senpiUserService.getSocialProfilesBySenpiIdMultiple(
                senpiIds,
                state.authorizationHeader as string,
                stringToUuid("SOCIAL_ALPHA")
            );
        const userIdToTwitterUsernames = new Map<string, string>();
        const userIdToFarcasterUser = new Map<
            string,
            { userName: string; userId: string }
        >();
        socialProfiles.userIdToSocialProfile.forEach((profile, userId) => {
            if (profile.twitterUsername) {
                userIdToTwitterUsernames.set(userId, profile.twitterUsername);
            }
            if (profile.farcasterUsername) {
                userIdToFarcasterUser.set(userId, {
                    userName: profile.farcasterUsername,
                    userId: profile.farcasterUserId,
                });
            }
            eligibleSenpiIds.push(userId);
        });

        socialProfiles.errorDetails.forEach((errorDetails, userId) => {
            ineligibleSenpiUsers.push(errorDetails);
        });

        elizaLogger.debug(
            `eligibleSenpiIds: ${eligibleSenpiIds}, ineligibleSenpiUsers: ${ineligibleSenpiUsers}`
        );

        if (ineligibleSenpiUsers.length > 0 && eligibleSenpiIds.length == 0) {
            await handleIneligibleSenpiUsers(ineligibleSenpiUsers, callback);
            return false;
        }

        if (eligibleSenpiIds.length === 0 && senpiIds.length === 0) {
            callback({
                text: "I couldn't find your favorite creators. Please make sure to mention their names or usernames (using '@').",
            });
            return false;
        }

        const promises = [];
        if (userIdToFarcasterUser.size > 0) {
            promises.push(
                fetchFarcasterCastsBySenpiUserIds(
                    userIdToFarcasterUser,
                    runtime,
                    10
                )
            );
        }

        if (userIdToTwitterUsernames.size > 0) {
            promises.push(
                fetchTweetsBySenpiUserIds(userIdToTwitterUsernames, runtime, 10)
            );
        }

        const results = await Promise.all(promises);

        console.log({ results: JSON.stringify(results) });
        const farcasterPosts = results[0];
        const twitterPosts = results[1];

        const displayFreeQueriesHeader =
            Number(socialProfiles.freeTrialLimit) -
                Number(socialProfiles.remainingFreeTrialCount) <
            Number(socialProfiles.freeTrialLimit);

        const newstate = await runtime.composeState(message, {
            twitterPosts: JSON.stringify(twitterPosts),
            farcasterPosts: JSON.stringify(farcasterPosts),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
            totalFreeQueries: socialProfiles.freeTrialLimit,
            usedFreeQueries:
                Number(socialProfiles.freeTrialLimit) -
                Number(socialProfiles.remainingFreeTrialCount),
            displayFreeQueriesHeader: displayFreeQueriesHeader,
            topCreatorsCount: TOP_CREATORS_COUNT,
            ineligibleSenpiUsers: JSON.stringify(ineligibleSenpiUsers),
        });

        const newContext = composeContext({
            state: newstate,
            template: templates.getSocialSummaryPrompt(
                displayFreeQueriesHeader
            ),
        });

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
            await handleIneligibleSenpiUsers(
                ineligibleSenpiUsers,
                callback,
                true
            );
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
