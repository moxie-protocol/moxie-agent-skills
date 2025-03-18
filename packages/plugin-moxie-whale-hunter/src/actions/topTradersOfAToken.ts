import {
    Action,
    composeContext,
    HandlerCallback,
    ModelProviderName,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    elizaLogger,
    streamText,
    stringToUuid,
} from "@moxie-protocol/core";
import { getTopBaseTraderOfAToken } from "../services/topBaseTraders";
import * as templates from "../templates";
import { extractTokenDetails } from "../utils";
import { MoxieUser, MoxieAgentDBAdapter } from "@moxie-protocol/moxie-agent-lib";
import { verifyUserBaseEconomyTokenOwnership } from "../utils";

export const topTraderOfATokenAction: Action = {
    name: "TOP_TRADER_OF_A_TOKEN",
    suppressInitialMessage: true,
    similes: [],
    description: "Retrieves and summarizes a list of users with the highest total transaction volumes of a token in the last 24 hours on the base blockchain.",
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
        elizaLogger.debug(`== in top traders of a token handler ==`);

        const moxieUserId = (state.moxieUserInfo as MoxieUser)?.id

        await (runtime.databaseAdapter as MoxieAgentDBAdapter).getFreeTrailBalance(moxieUserId, stringToUuid("WHALE_HUNTER"));
        const { total_free_queries, remaining_free_queries: new_remaining_free_queries } = await (runtime.databaseAdapter as MoxieAgentDBAdapter).deductFreeTrail(moxieUserId, stringToUuid("WHALE_HUNTER"));

        if (new_remaining_free_queries > 0) {
            elizaLogger.debug(`[topTraderOfATokenAction] [${moxieUserId}] Remaining free queries: ${new_remaining_free_queries}`);
        } else {
            // If no remaining free queries, check if user has base economy token > 1
            try {
                const hasSufficientBalance = await verifyUserBaseEconomyTokenOwnership(moxieUserId, runtime);
                if (!hasSufficientBalance) {
                    await callback({ text: "You need to hold at least 1 base economy token to use this action.", action: "TOP_TOKEN_HOLDERS" });
                    return false;
                }
            } catch (error) {
                elizaLogger.error('Error verifying user base economy token ownership:', error);
                await callback({ text: "There was an error verifying your token ownership. Please try again.", action: "TOP_TOKEN_HOLDERS" });
                return false;
            }
        }

        const tokenDetails = await extractTokenDetails(message.content.text, runtime);
        if (!tokenDetails || !tokenDetails.tokenAddress) {
            elizaLogger.error(`Invalid token details - ${message.content.text}`);
            callback({ text: "Invalid token details" });
            return false;
        }
        elizaLogger.debug(`Token details: ${JSON.stringify(tokenDetails)}`);
        const topTradersOfAToken = await getTopBaseTraderOfAToken(tokenDetails.tokenAddress);
        elizaLogger.debug(`Top traders of a token: ${JSON.stringify(topTradersOfAToken)}`);
        const newstate = await runtime.composeState(message, {
            message: message.content.text,
            currentDate: new Date().toLocaleString(),
            topTradersOfAToken: JSON.stringify(topTradersOfAToken),
        });

        const context = composeContext({
            state: newstate,
            template: templates.topTradersOfAToken,
        });

        const stream = await streamText({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            modelConfigOptions: {
                modelProvider: ModelProviderName.OPENAI,
                temperature: 1.0,
                apiKey: process.env.OPENAI_API_KEY!,
                modelClass: ModelClass.LARGE,
            },
        });

        for await (const textPart of stream) {
            callback({ text: textPart });
        }

        return true;
    },
    examples: [
      [      {
                user: "user",
                content: {
                    text: "Who are the top traders of a $MOXIE?",
                },
            },
            {
                user: "assistant",
                content: {
                    text: "The top traders of a $MOXIE are...",
                },
            },
        ],
    ],
};
