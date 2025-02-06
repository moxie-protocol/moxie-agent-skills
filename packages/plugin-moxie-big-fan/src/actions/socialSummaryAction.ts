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
} from "@elizaos/core";
import { moxieUserService } from "@elizaos/moxie-lib";
import { fetchFarcasterCastsByMoxieUserIds } from "./farcasterSummaryAction";
import { fetchTweetsByMoxieUserIds } from "./twitterSummaryAction";
import * as templates from "../templates";
import { getMoxieIdsFromMessage, streamTextByLines } from "./utils";

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
            templates.socialSummaryExamples,
            state,
            runtime
        );
        elizaLogger.debug(
            `searching for social posts for moxieIds: ${moxieIds}`
        );
        if (moxieIds.length === 0) {
            callback({
                text: "I couldn't find your favorite creators. Please buy creator tokens to get started.",
            });
            return false;
        }

        const socialProfiles =
            await moxieUserService.getSocialProfilesByMoxieIdMultiple(moxieIds);
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
                fetchFarcasterCastsByMoxieUserIds(userIdToFarcasterUser, runtime)
            );
        }

        if (userIdToTwitterUsernames.size > 0) {
            promises.push(
                fetchTweetsByMoxieUserIds(userIdToTwitterUsernames, runtime)
            );
        }

        const results = await Promise.all(promises);

        console.log({ results: JSON.stringify(results) });
        const farcasterPosts = results[0];
        const twitterPosts = results[1];

        const newstate = await runtime.composeState(message, {
            twitterPosts: JSON.stringify(twitterPosts),
            farcasterPosts: JSON.stringify(farcasterPosts),
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
        });

        const context = composeContext({
            state: newstate,
            template: templates.socialSummary,
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
