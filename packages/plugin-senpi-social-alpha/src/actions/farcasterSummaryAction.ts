import {
    Action,
    composeContext,
    generateText,
    HandlerCallback,
    ModelProviderName,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    streamText,
    stringToUuid,
    parseJSONObjectFromText,
} from "@senpi-ai/core";

import {
    senpiUserService,
    SenpiAgentDBAdapter,
    SenpiUser,
} from "@senpi-ai/senpi-agent-lib";
import * as templates from "../templates";
import { Cast, fetchCastByFid } from "../services/farcasterService";
import {
    getSenpiIdsFromMessage,
    streamTextByLines,
    handleIneligibleSenpiUsers,
} from "./utils";
import { FIVE_MINS, getFarcasterCastsCacheKey, ONE_HOUR } from "../cache";
import { TOP_CREATORS_COUNT } from "../config";

const SOCIAL_ALPHA = "SOCIAL_ALPHA";

export async function fetchFarcasterCastsBySenpiUserIds(
    userIdToFarcasterUsernames: Map<
        string,
        { userName: string; userId: string }
    >,
    runtime: IAgentRuntime,
    maxCastsPerUser: number = 20
) {
    const castPromises = Array.from(userIdToFarcasterUsernames.entries()).map(
        async ([senpiId, farcasterDetails]) => {
            try {
                elizaLogger.info(
                    `Fetching farcaster casts for ${farcasterDetails.userName} ${farcasterDetails.userId}`
                );
                const cachedCasts = await runtime.cacheManager.get(
                    getFarcasterCastsCacheKey(farcasterDetails.userId)
                );

                let casts = [];

                if (cachedCasts) {
                    casts = JSON.parse(cachedCasts as string);
                } else {
                    casts = await fetchCastByFid(
                        farcasterDetails.userId,
                        maxCastsPerUser
                    );
                }

                elizaLogger.debug(
                    `${farcasterDetails.userName} ${farcasterDetails.userId} ${casts.length}}`
                );

                // Only process if casts array exists and has items
                if (!casts || !Array.isArray(casts) || casts.length === 0) {
                    elizaLogger.warn(
                        `No casts found for ${farcasterDetails.userName}`
                    );
                    return {
                        senpiId,
                        userName: farcasterDetails.userName,
                        userId: farcasterDetails.userId,
                        casts: [],
                    };
                }

                const filteredCasts = casts.map((cast: Cast) => ({
                    ...cast,
                    url: `https://warpcast.com/${farcasterDetails.userName}/${cast.hash.toString().substring(0, 10)}`,
                }));

                if (casts.length > 0) {
                    await runtime.cacheManager.set(
                        getFarcasterCastsCacheKey(farcasterDetails.userId),
                        JSON.stringify(casts),
                        {
                            expires: Date.now() + FIVE_MINS,
                        }
                    );
                }

                elizaLogger.debug(
                    `Fetched ${casts.length} casts for ${farcasterDetails.userName}`
                );

                return {
                    senpiId,
                    userName: farcasterDetails.userName,
                    userId: farcasterDetails.userId,
                    casts: filteredCasts,
                };
            } catch (error) {
                console.log({ error });
                elizaLogger.error(
                    `Error fetching farcaster for ${farcasterDetails.userName} ${farcasterDetails.userId}:`,
                    error
                );
                return null;
            }
        }
    );

    return (await Promise.all(castPromises)).filter(
        (result) => result !== null
    );
}

export const creatorFarcasterSummary: Action = {
    name: "FARCASTER_SUMMARY",
    suppressInitialMessage: true,
    similes: [
        "FARCASTER_HISTORY",
        "FARCASTER_ACTIVITY",
        "FARCASTER_UPDATES",
        "FARCASTER_CASTS",
    ],
    description:
        "Retrieves and summarizes recent Farcaster posts (casts), providing insights into individual activity, trending topics, and creator updates. Use this when the request specifically mentions Farcaster or casts.",
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
            `searching for farcaster casts for senpiIds: ${senpiIds}`
        );
        // if (senpiIds.length === 0) {
        //     callback({
        //         text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
        //     });
        //     return false;
        // }

        // Get Twitter usernames for all Senpi IDs
        const socialProfiles =
            await senpiUserService.getSocialProfilesBySenpiIdMultiple(
                senpiIds,
                state.authorizationHeader as string,
                stringToUuid(SOCIAL_ALPHA)
            );
        const userIdToFarcasterUser = new Map<
            string,
            { userName: string; userId: string }
        >();
        const ineligibleSenpiUsers = [];
        const eligibleSenpiIds = [];
        socialProfiles.userIdToSocialProfile.forEach((profile, userId) => {
            if (profile.farcasterUserId) {
                userIdToFarcasterUser.set(userId, {
                    userName: profile.farcasterUsername,
                    userId: profile.farcasterUserId,
                });
            }
            eligibleSenpiIds.push(userId);
        });

        socialProfiles.errorDetails.forEach((errorDetails, userId) => {
            if (errorDetails) {
                ineligibleSenpiUsers.push(errorDetails);
            }
        });

        if (ineligibleSenpiUsers.length > 0 && eligibleSenpiIds.length == 0) {
            await handleIneligibleSenpiUsers(
                ineligibleSenpiUsers,
                callback,
                false
            );
            return false;
        }

        if (eligibleSenpiIds.length === 0 && senpiIds.length === 0) {
            callback({
                text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
            });
            return false;
        }

        if (userIdToFarcasterUser.size === 0) {
            callback({
                text: "I couldn't find any Farcaster accounts linked to these Senpi users",
            });
            return false;
        }

        const allCasts = await fetchFarcasterCastsBySenpiUserIds(
            userIdToFarcasterUser,
            runtime
        );

        if (allCasts.length === 0) {
            callback({
                text: "I couldn't fetch any casts from the associated farcaster accounts.",
            });
            return false;
        }

        const displayFreeQueriesHeader =
            Number(socialProfiles.freeTrialLimit) -
                Number(socialProfiles.remainingFreeTrialCount) <
            Number(socialProfiles.freeTrialLimit);

        const newstate = await runtime.composeState(message, {
            tweets: JSON.stringify(allCasts),
            ineligibleSenpiUsers: JSON.stringify(ineligibleSenpiUsers),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
            totalFreeQueries: socialProfiles.freeTrialLimit,
            usedFreeQueries:
                Number(socialProfiles.freeTrialLimit) -
                Number(socialProfiles.remainingFreeTrialCount),
            topCreatorsCount: TOP_CREATORS_COUNT,
            displayFreeQueriesHeader: displayFreeQueriesHeader,
        });

        // Create a summary context for the model
        const newContext = composeContext({
            state: newstate,
            template: templates.getFarcasterSummaryPrompt(
                displayFreeQueriesHeader
            ),
        });

        const summaryStream = streamText({
            runtime,
            context: newContext,
            modelClass: ModelClass.LARGE,
            modelConfigOptions: {
                temperature: 1.0,
                modelProvider: ModelProviderName.OPENAI,
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
