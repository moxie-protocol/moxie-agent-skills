import {
    composeContext,
    elizaLogger,
    generateText,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";
import {
    portfolioService,
    MoxiePortfolio,
    MoxieUser,
} from "@elizaos/moxie-lib";
import { ftaService } from "@elizaos/moxie-lib";
import {
    FIVE_MINS,
    getCurrentMoxieUserContextCacheKey,
    getTopCreatorsCacheKey,
    ONE_DAY,
} from "../cache";
import * as templates from "../templates";
import { topCreatorsTwitterExamples } from "../templates";

export async function fetchTopCreatorsByMoxieId(
    moxieId: string,
    runtime: IAgentRuntime
): Promise<string[]> {
    try {
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
                10
            );


        const moxieUserIds = portfolio
            .filter((p) => p?.fanTokenMoxieUserId && p?.fanTokenMoxieUserId !== moxieId)
            .map((p) => p.fanTokenMoxieUserId);


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
    isTopTokenOwnersQuery?: boolean
): Promise<string[]> {
    try {

        const key = getCurrentMoxieUserContextCacheKey(message.roomId);
        const messageText = message.content.text || "";
        const moxieIdPattern = /\bM\d+\b/g;
        let moxieIds: string[] = messageText.match(moxieIdPattern) || [];

        if (isTopTokenOwnersQuery && moxieIds.length === 0) {
            const cachedMoxieUserContext = await runtime.cacheManager.get(key);

            if (cachedMoxieUserContext) {
                moxieIds = JSON.parse(cachedMoxieUserContext as string);
            }

            const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;
            const topCreatorMoxieIds = await fetchTopCreatorsByMoxieId(
                moxieUserInfo.id,
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