import {
    composeContext,
    elizaLogger,
    generateText,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@senpi-ai/core";
import {
    portfolioService,
    SenpiUser,
    fetchPluginTokenGate,
} from "@senpi-ai/senpi-agent-lib";

import {
    FIVE_MINS,
    getCurrentSenpiUserContextCacheKey,
    getTopCreatorsCacheKey,
    ONE_DAY,
} from "../cache";
import * as templates from "../templates";
import { topCreatorsTwitterExamples } from "../templates";
import { FREEMIUM_TRENDING_CREATORS } from "../config";
import { roundToDecimalPlaces } from "../utils";

const FREEMIUM_TRENDING_CREATORS_LIST = FREEMIUM_TRENDING_CREATORS
    ? FREEMIUM_TRENDING_CREATORS.split(",")
    : [];

export async function fetchTopCreatorsBySenpiId(
    senpiId: string,
    noOfUsers: number,
    runtime: IAgentRuntime
): Promise<string[]> {
    try {
        elizaLogger.debug(`-- fetching top creators for ${senpiId}`);
        const cachedCreators = await runtime.cacheManager.get(
            getTopCreatorsCacheKey(senpiId)
        );

        if (cachedCreators) {
            elizaLogger.debug(`using cached creators list for ${senpiId}`);
            return JSON.parse(cachedCreators as string);
        }
        const portfolio =
            await portfolioService.fetchPortfolioBySenpiIdOrderByTVL(
                senpiId,
                noOfUsers
            );

        const senpiUserIds = portfolio
            .filter(
                (p) =>
                    p?.fanTokenSenpiUserId && p?.fanTokenSenpiUserId !== senpiId
            )
            .map((p) => p.fanTokenSenpiUserId);

        elizaLogger.debug(`top creators senpiUserIds: ${senpiUserIds}`);
        elizaLogger.debug(`caching creators list for ${senpiId}`);

        if (senpiUserIds.length > 0) {
            await runtime.cacheManager.set(
                getTopCreatorsCacheKey(senpiId),
                JSON.stringify(senpiUserIds),
                {
                    expires: Date.now() + FIVE_MINS,
                }
            );
        }

        return senpiUserIds;
    } catch (error) {
        elizaLogger.error(`Error fetching portfolio for ${senpiId}:`, error);
    }
    return [];
}

export async function getSenpiIdsFromMessage(
    message: Memory,
    contextExampleTemplate: string,
    state?: State,
    runtime?: IAgentRuntime,
    isTopTokenOwnersQuery?: boolean,
    noOfTopUsers?: number
): Promise<string[]> {
    try {
        if (isTopTokenOwnersQuery) {
            const senpiUserInfo: SenpiUser = state.senpiUserInfo as SenpiUser;
            const topCreatorSenpiIds = await fetchTopCreatorsBySenpiId(
                senpiUserInfo.id,
                noOfTopUsers || 10,
                runtime
            );
            return topCreatorSenpiIds;
        }

        const key = getCurrentSenpiUserContextCacheKey(message.roomId);
        const messageText = message.content.text || "";
        // const senpiIdPattern = /\bM\d+\b/g;
        let senpiIds: string[] = [];

        //check for any text with @ which is failed attempt to mention in the messageText
        const atPattern = /@\[([^|\]]+)\|M\d+\]/g;
        const atMatches = messageText.match(atPattern) || [];
        if (atMatches.length > 0) {
            elizaLogger.debug(
                `Found @ mentions in message: ${atMatches.join(", ")}`
            );
            // Extract Senpi IDs from mentions in format @[name|MID]
            const senpiIdsFromMentions = atMatches
                .map((match) => {
                    const parts = match.match(/@\[(.*?)\|(M\d+)\]/);
                    return parts ? parts[2] : null;
                })
                .filter((id) => id !== null);
            senpiIds = senpiIdsFromMentions;
        } else {
            // Check for invalid @ mentions
            const invalidAtPattern = /@\w+/g;
            const invalidMentions = messageText.match(invalidAtPattern);
            if (invalidMentions) {
                elizaLogger.error(
                    `Invalid mention format found: ${invalidMentions.join(", ")}. Expected format: @[name|MID]`
                );
                throw new Error(
                    "Invalid mention format. Please use format: @[name|MID]"
                );
            }
        }

        elizaLogger.debug(`senpiIds at this point: ${senpiIds}`);
        if (senpiIds.length === 0) {
            const cachedSenpiUserContext = await runtime.cacheManager.get(key);

            if (cachedSenpiUserContext) {
                senpiIds = JSON.parse(cachedSenpiUserContext as string);
            }

            const senpiUserInfo: SenpiUser = state.senpiUserInfo as SenpiUser;
            elizaLogger.debug(`fetching top creators for ${senpiUserInfo.id}`);
            const topCreatorSenpiIds = await fetchTopCreatorsBySenpiId(
                senpiUserInfo.id,
                noOfTopUsers || 10,
                runtime
            );

            // prompt checking in current question is followup question of previous one
            const newstate = await runtime.composeState(message, {
                message: message.content.text,
                senpiIds: senpiIds,
                topCreatorSenpiIds: topCreatorSenpiIds,
                examples: contextExampleTemplate,
            });
            // Create a summary context for the model
            const context = composeContext({
                state: newstate,
                template: templates.currentUserContext,
            });

            // Generate summary using the model
            const generatedSenpiIds = await generateText({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            senpiIds = JSON.parse(generatedSenpiIds as string);
        }

        await runtime.cacheManager.set(key, JSON.stringify(senpiIds), {
            expires: Date.now() + ONE_DAY,
        });
        elizaLogger.debug(`Senpi IDs from message: ${senpiIds}`);
        return senpiIds;
    } catch (error) {
        elizaLogger.error("Error getting Senpi IDs from message:", error);
        console.error("Error getting Senpi IDs from message:", error);
        return [];
    }
}

export async function streamTextByLines(
    stream: AsyncIterable<string>,
    onLine: (text: string) => void
) {
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

export async function handleIneligibleSenpiUsers(
    ineligibleSenpiUsers,
    callback,
    breakLine = false
) {
    const messageParts = [];

    if (breakLine === true) {
        messageParts.push("\n");
        messageParts.push("\n");
    }

    if (ineligibleSenpiUsers.length == 1) {
        const userprofileLinkText = `[@${ineligibleSenpiUsers[0].requestedUserName}](https://senpi.ai/profile/${ineligibleSenpiUsers[0].requestedId})`;

        let remainingNoOfTokensToBuy =
            ineligibleSenpiUsers[0].expectedCreatorCoinBalance -
            ineligibleSenpiUsers[0].actualCreatorCoinBalance;
        if (remainingNoOfTokensToBuy < 0) {
            remainingNoOfTokensToBuy = 0;
        }

        if (breakLine === true) {
            if (ineligibleSenpiUsers[0].actualCreatorCoinBalance > 0) {
                messageParts.push(
                    `I can also get you that social alpha on ${userprofileLinkText}, but you’ll need some ${userprofileLinkText} coins to unlock it.\n\n`
                );
            } else {
                messageParts.push(
                    `I can also get you that social alpha on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their coins to unlock it.\n\n`
                );
            }
        } else {
            messageParts.push(
                `I can get you that social alpha on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their coins to unlock it.\n\n`
            );
        }
        if (ineligibleSenpiUsers[0].actualCreatorCoinBalance > 0) {
            messageParts.push(
                `It costs ${remainingNoOfTokensToBuy} (~$${roundToDecimalPlaces(ineligibleSenpiUsers[0].requiredSenpiAmountInUSD, 2)}) ${userprofileLinkText} to access, and right now, you have only ${ineligibleSenpiUsers[0].actualCreatorCoinBalance} ${userprofileLinkText} in your wallet. Want me to grab them for you now? Just say the word, and I’ll handle it! 🚀`
            );
        } else {
            messageParts.push(
                `It costs ~$${roundToDecimalPlaces(ineligibleSenpiUsers[0].requiredSenpiAmountInUSD, 2)} for lifetime access. Do you want me to buy it for you?`
            );
        }

        for (const part of messageParts) {
            callback({ text: part });
        }
    } else if (ineligibleSenpiUsers.length > 1) {
        const userLinks = ineligibleSenpiUsers
            .map(
                (user) =>
                    `[@${user.requestedUserName}](https://senpi.ai/profile/${user.requestedId})`
            )
            .join(", ");

        if (breakLine === true) {
            messageParts.push(
                `I can also get you that social alpha on ${userLinks} - we just need to grab some of their coins first. Head over to the Social Alpha skill page and you can easily add them! `
            );
        } else {
            messageParts.push(
                `I can get you that social alpha on ${userLinks} - we just need to grab some of their coins first. Head over to the Social Alpha skill page and you can easily add them! `
            );
        }
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    } else {
        messageParts.push(
            "You should own some creator coins to access this feature. Head over to the Social Alpha skill page and you can easily add them!"
        );
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    }
}
