import {
    composeContext,
    elizaLogger,
    generateText,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@moxie-protocol/core";
import {
    portfolioService,
    MoxieUser,
    fetchPluginTokenGate,
} from "@moxie-protocol/moxie-agent-lib";

import {
    FIVE_MINS,
    getCurrentMoxieUserContextCacheKey,
    getTopCreatorsCacheKey,
    ONE_DAY,
} from "../cache";
import * as templates from "../templates";
import { topCreatorsTwitterExamples } from "../templates";
import { FREEMIUM_TRENDING_CREATORS } from "../config";
import { roundToDecimalPlaces } from "../utils";

const FREEMIUM_TRENDING_CREATORS_LIST = FREEMIUM_TRENDING_CREATORS ? FREEMIUM_TRENDING_CREATORS.split(",") : [];

export async function fetchTopCreatorsByMoxieId(
    moxieId: string,
    noOfUsers: number,
    runtime: IAgentRuntime
): Promise<string[]> {
    try {
        elizaLogger.debug(`-- fetching top creators for ${moxieId}`);
        const cachedCreators = await runtime.cacheManager.get(
            getTopCreatorsCacheKey(moxieId)
        );

        if (cachedCreators) {
            elizaLogger.debug(`using cached creators list for ${moxieId}`);
            return JSON.parse(cachedCreators as string);
        }
        const portfolio =
            await portfolioService.fetchPortfolioByMoxieIdOrderByTVL(
                moxieId,
                noOfUsers
            );


        const moxieUserIds = portfolio
            .filter((p) => p?.fanTokenMoxieUserId && p?.fanTokenMoxieUserId !== moxieId)
            .map((p) => p.fanTokenMoxieUserId);

        elizaLogger.debug(`top creators moxieUserIds: ${moxieUserIds}`);
        elizaLogger.debug(`caching creators list for ${moxieId}`);

        if(moxieUserIds.length > 0) {
        await runtime.cacheManager.set(
            getTopCreatorsCacheKey(moxieId),
            JSON.stringify(moxieUserIds),
                {
                    expires: Date.now() + FIVE_MINS,
                }
            );
        }

        return moxieUserIds;
    } catch (error) {
        elizaLogger.error(`Error fetching portfolio for ${moxieId}:`, error);
    }
    return [];
}

export async function getMoxieIdsFromMessage(
    message: Memory,
    contextExampleTemplate: string,
    state?: State,
    runtime?: IAgentRuntime,
    isTopTokenOwnersQuery?: boolean,
    noOfTopUsers?: number
): Promise<string[]> {
    try {

        if (isTopTokenOwnersQuery) {
            const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;
            const topCreatorMoxieIds = await fetchTopCreatorsByMoxieId(
                moxieUserInfo.id,
                noOfTopUsers || 10,
                runtime
            );
            return topCreatorMoxieIds;
        }

        const key = getCurrentMoxieUserContextCacheKey(message.roomId);
        const messageText = message.content.text || "";
        // const moxieIdPattern = /\bM\d+\b/g;
        let moxieIds: string[] = [];

        //check for any text with @ which is failed attempt to mention in the messageText
        const atPattern = /@\[([^|\]]+)\|M\d+\]/g;
        const atMatches = messageText.match(atPattern) || [];
        if (atMatches.length > 0) {
            elizaLogger.debug(`Found @ mentions in message: ${atMatches.join(', ')}`);
            // Extract Moxie IDs from mentions in format @[name|MID]
            const moxieIdsFromMentions = atMatches
                .map(match => {
                    const parts = match.match(/@\[(.*?)\|(M\d+)\]/);
                    return parts ? parts[2] : null;
                })
                .filter(id => id !== null);
            moxieIds = moxieIdsFromMentions;
        } else {
            // Check for invalid @ mentions
            const invalidAtPattern = /@\w+/g;
            const invalidMentions = messageText.match(invalidAtPattern);
            if (invalidMentions) {
                elizaLogger.error(`Invalid mention format found: ${invalidMentions.join(', ')}. Expected format: @[name|MID]`);
                throw new Error('Invalid mention format. Please use format: @[name|MID]');
            }
        }

        elizaLogger.debug(`moxieIds at this point: ${moxieIds}`);
        if (moxieIds.length === 0) {
            const cachedMoxieUserContext = await runtime.cacheManager.get(key);

            if (cachedMoxieUserContext) {
                moxieIds = JSON.parse(cachedMoxieUserContext as string);
            }

            const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;
            elizaLogger.debug(`fetching top creators for ${moxieUserInfo.id}`);
            const topCreatorMoxieIds = await fetchTopCreatorsByMoxieId(
                moxieUserInfo.id,
                noOfTopUsers || 10,
                runtime
            );

            // prompt checking in current question is followup question of previous one
            const newstate = await runtime.composeState(message, {
                message: message.content.text,
                moxieIds: moxieIds,
                topCreatorMoxieIds: topCreatorMoxieIds,
                examples: contextExampleTemplate,
            });
            // Create a summary context for the model
            const context = composeContext({
                state: newstate,
                template: templates.currentUserContext,
            });

            // Generate summary using the model
            const generatedMoxieIds = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            moxieIds = JSON.parse(generatedMoxieIds as string);

        }

        await runtime.cacheManager.set(key, JSON.stringify(moxieIds), { expires: Date.now() + ONE_DAY });
        elizaLogger.debug(`Moxie IDs from message: ${moxieIds}`);
        return moxieIds;
    } catch (error) {
        elizaLogger.error("Error getting Moxie IDs from message:", error);
        console.error("Error getting Moxie IDs from message:", error);
        return [];
    }
}


export async function streamTextByLines(stream: AsyncIterable<string>, onLine: (text: string) => void) {
    let buffer = "";
    for await (const textPart of stream) {
        buffer += textPart;

        // Only send complete sentences
        if (buffer.includes("\n")) {
            const parts = buffer.split("\n");
            const completeLines = parts.slice(0, -1);
            if (completeLines.length > 0) {
                const completeText = completeLines.join("\n");
                onLine(completeText + "\n");
            }
            // Keep the last partial line in buffer
            buffer = parts[parts.length - 1];
        }
    }
    if (buffer.trim()) {
        onLine(buffer);
    }
}

export async function getEligibleMoxieIds(moxieUserInfo: MoxieUser, new_remaining_free_queries: number, moxieIds: string[]) {
    let eligibleMoxieIds = [];
    let ineligibleMoxieUsers = []

    if (new_remaining_free_queries < 0) {
        const pluginTokenGate = await fetchPluginTokenGate({
            currentUserMoxieId: moxieUserInfo.id,
            moxieIds: moxieIds,
        });
        pluginTokenGate.forEach((token) => {
            if (token.requiredTokens > 0) {
                ineligibleMoxieUsers.push({
                    username: token.fanTokenName,
                    moxieId: token.creatorMoxieId,
                    currentBalance: token.currentBalance,
                    minimumRequiredToken: token.minTokenRequiredForCreator,
                    requiredTokens: roundToDecimalPlaces(token.requiredTokens, 4),
                    label: `@[${token.fanTokenName}|${token.creatorMoxieId}]`,
                });
            }
        });
        eligibleMoxieIds = moxieIds.filter((id) => !ineligibleMoxieUsers.some(user => user.moxieId === id));
    } else {
        if (moxieIds.length > 0) {
            eligibleMoxieIds = moxieIds;
        } else {
            eligibleMoxieIds = FREEMIUM_TRENDING_CREATORS_LIST;
        }
    }
    return {
        eligibleMoxieIds,
        ineligibleMoxieUsers,
    };
}

export async function handleIneligibleMoxieUsers(ineligibleMoxieUsers, callback, breakLine = false) {
    const messageParts = [];

    if (breakLine === true) {
        messageParts.push("\n");
        messageParts.push("\n");
    }

    if (ineligibleMoxieUsers.length == 1) {
        const userprofileLinkText = `[@${ineligibleMoxieUsers[0].username}](https://moxie.xyz/profile/${ineligibleMoxieUsers[0].moxieId})`;

        if (breakLine === true) {
            messageParts.push(`I can also get you that social alpha on ${userprofileLinkText}, but you’ll need some ${userprofileLinkText} coins to unlock it.\n\n`);
        } else {
        messageParts.push(`I can get you that social alpha on ${userprofileLinkText}, but you’ll need some ${userprofileLinkText} coins to unlock it.\n\n`);
        }
        if (ineligibleMoxieUsers[0].currentBalance > 0) {
            messageParts.push(`It costs ${ineligibleMoxieUsers[0].minimumRequiredToken} ${userprofileLinkText} to access, and right now, you have only ${ineligibleMoxieUsers[0].currentBalance} ${userprofileLinkText} in your wallet. Want me to grab them for you now? Just say the word, and I’ll handle it! 🚀`);
        } else {
            messageParts.push(`It costs ${ineligibleMoxieUsers[0].minimumRequiredToken} ${userprofileLinkText} to access, you don’t have any in your wallet. Want me to grab them for you now? Just say the word, and I’ll handle it! 🚀`);
        }

        for (const part of messageParts) {
            callback({ text: part  });
        }
    } else if (ineligibleMoxieUsers.length > 1) {
        const userLinks = ineligibleMoxieUsers.map((user) => `[@${user.username}](https://moxie.xyz/profile/${user.moxieId})`).join(", ");

        if (breakLine === true) {
            messageParts.push(`I can also get you that social alpha on ${userLinks} - we just need to grab some of their coins first. Head over to the Social Alpha skill page and you can easily add them! `);
        } else {
            messageParts.push(`I can get you that social alpha on ${userLinks} - we just need to grab some of their coins first. Head over to the Social Alpha skill page and you can easily add them! `);
        }
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    } else {
        messageParts.push("You should own some creator coins to access this feature. Head over to the Social Alpha skill page and you can easily add them!");
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    }
}
