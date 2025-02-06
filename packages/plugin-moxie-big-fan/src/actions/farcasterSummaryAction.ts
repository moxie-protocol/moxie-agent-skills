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
} from "@elizaos/core";

import { moxieUserService } from "@elizaos/moxie-lib";
import * as templates from "../templates";
import { Cast, fetchCastByFid } from "../services/farcasterService";
import { getMoxieIdsFromMessage, streamTextByLines } from "./utils";
import { FIVE_MINS, getFarcasterCastsCacheKey, ONE_HOUR } from "../cache";

export async function fetchFarcasterCastsByMoxieUserIds(
    userIdToFarcasterUsernames: Map<
        string,
        { userName: string; userId: string }
    >,
    runtime: IAgentRuntime
) {
    const maxCastsPerUser = 40;
    const castPromises = Array.from(userIdToFarcasterUsernames.entries()).map(
        async ([moxieId, farcasterDetails]) => {
            try {
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
                        moxieId,
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
                    moxieId,
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
        "This action fetches and summarizes recent cast done by users on farcaster social network",
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
        const moxieIds: string[] = await getMoxieIdsFromMessage(
            message,
            templates.topCreatorsFarcasterExamples,
            state,
            runtime
        );
        elizaLogger.debug(
            `searching for farcaster casts for moxieIds: ${moxieIds}`
        );
        if (moxieIds.length === 0) {
            callback({
                text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
            });
            return false;
        }

        // Get Twitter usernames for all Moxie IDs
        const socialProfiles =
            await moxieUserService.getSocialProfilesByMoxieIdMultiple(moxieIds);
        const userIdToFarcasterUser = new Map<
            string,
            { userName: string; userId: string }
        >();
        socialProfiles.forEach((profile, userId) => {
            if (profile.farcasterUserId) {
                userIdToFarcasterUser.set(userId, {
                    userName: profile.farcasterUsername,
                    userId: profile.farcasterUserId,
                });
            }
        });
        if (userIdToFarcasterUser.size === 0) {
            callback({
                text: "I couldn't find any Farcaster accounts linked to these Moxie users",
            });
            return false;
        }

        const allCasts = await fetchFarcasterCastsByMoxieUserIds(
            userIdToFarcasterUser,
            runtime
        );

        if (allCasts.length === 0) {
            callback({
                text: "I couldn't fetch any casts from the associated farcaster accounts.",
            });
            return false;
        }

        const newstate = await runtime.composeState(message, {
            tweets: JSON.stringify(allCasts),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
        });
        // Create a summary context for the model
        const context = composeContext({
            state: newstate,
            template: templates.castsSummary,
        });

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
