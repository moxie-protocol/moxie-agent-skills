import {
    Action,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    streamText,
    stringToUuid,
} from "@moxie-protocol/core";
import {
    MoxieUser,
    moxieUserService,
    getTokenDetails,
    TokenDetails,
    MoxieAgentDBAdapter,
} from "@moxie-protocol/moxie-agent-lib";
import { extractTokenAddressTemplate, topTokenHoldersSummary } from "../templates";
import { getTopTokenHolders, formatMessages, verifyUserBaseEconomyTokenOwnership, fetchTotalSupply } from "../utils";
import { DUNE_API_KEY, WHALE_HUNTER_QUERY_ID } from "../config";
import { TokenAddresses, TokenHolderDuneResponse } from "../types/whales";

/**
 * Action to fetch and display top token holders for a given token
 * Supports both free trial queries and base economy token holders
 */
export const topTokenHoldersAction: Action = {
    name: "TOP_TOKEN_HOLDERS",
    suppressInitialMessage: true,
    similes: [
        "TOP_TOKEN_HOLDERS",
        "WHALE_HUNTER",
        "WHALE_TOKEN_HOLDERS",
    ],
    description: "Fetches the top token holders of any ERC20 token, including their holdings amount, USD value.",

    /**
     * Validates required environment variables before executing action
     */
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {
        if (!DUNE_API_KEY) {
            elizaLogger.error("DUNE_API_KEY is not set");
            return false;
        }
        if (!WHALE_HUNTER_QUERY_ID) {
            elizaLogger.error("WHALE_HUNTER_QUERY_ID is not set");
            return false;
        }
        return true;
    },

    /**
     * Main handler for the top token holders action
     */
    handler: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> {
        elizaLogger.debug("== in top token holders action == ");

        // Format conversation history and get user ID
        const conversation = formatMessages({
            agentId: runtime.agentId,
            actors: state?.actorsData ?? [],
            messages: state?.recentMessagesData,
        });
        const moxieUserId = (state.moxieUserInfo as MoxieUser)?.id;

        // Check and handle free trial usage
        await (runtime.databaseAdapter as MoxieAgentDBAdapter).getFreeTrailBalance(moxieUserId, stringToUuid("WHALE_HUNTER"));
        // const { remaining_free_queries: new_remaining_free_queries } = await (runtime.databaseAdapter as MoxieAgentDBAdapter).deductFreeTrail(moxieUserId, stringToUuid("WHALE_HUNTER"));

        // if (new_remaining_free_queries > 0) {
        //     elizaLogger.debug(`[topTokenHoldersAction] [${moxieUserId}] Remaining free queries: ${new_remaining_free_queries}`);
        // } else {
        //     // Verify base economy token ownership if no free queries remain
        //     try {
        //         const hasSufficientBalance = await verifyUserBaseEconomyTokenOwnership(moxieUserId, runtime);
        //         if (!hasSufficientBalance) {
        //             await callback({ text: "You need to hold at least 1 base economy token to use this action.", action: "TOP_TOKEN_HOLDERS" });
        //             return false;
        //         }
        //     } catch (error) {
        //         elizaLogger.error('Error verifying user base economy token ownership:', error);
        //         await callback({ text: "There was an error verifying your token ownership. Please try again.", action: "TOP_TOKEN_HOLDERS" });
        //         return false;
        //     }
        // }

        let tokenAddresses = [];
        let topNHolders = 10;

        tokenAddresses = message.content.text.match(/0x[a-fA-F0-9]{40}/g) || [];

        if (tokenAddresses.length === 0) {
            state = (await runtime.composeState(message, {
                conversation,
                latestMessage: message.content.text,
                userMoxieId: moxieUserId,
            })) as State;

            const context = composeContext({
                state,
                template: extractTokenAddressTemplate,
            });

            const tokenAddressesResponse = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            }) as TokenAddresses;

            // Validate token addresses and holder limit
            tokenAddresses = tokenAddressesResponse.tokenAddresses.map(address => address.toLowerCase());
            topNHolders = tokenAddressesResponse.topNHolders || 10;
        } else {
            tokenAddresses = tokenAddresses.map(address => address.toLowerCase());
        }

        if (tokenAddresses.length === 0) {
            await callback({ text: "No token addresses found. Please specify the token addresses for which you want to get the top token holders. (e.g. $MOXIE)", action: "TOP_TOKEN_HOLDERS" });
            return false;
        }

        if (tokenAddresses.length > 1) {
            await callback({ text: "You can only fetch top holders of 1 token at a time. Please specify the token address you want to get the top token holders for.", action: "TOP_TOKEN_HOLDERS" });
            return false;
        }

        if (topNHolders > 25) {
            await callback({ text: "You can only specify up to 25 top token holders at a time.", action: "TOP_TOKEN_HOLDERS" });
            return false;
        }

        // Fetch token details and holders
        let tokenDetails: TokenDetails[], topTokenHolders: TokenHolderDuneResponse[], tokenTotalSupply: string;
        try {
            [tokenDetails, topTokenHolders, tokenTotalSupply] = await Promise.all([
                getTokenDetails(tokenAddresses),
                getTopTokenHolders(tokenAddresses[0], topNHolders),
                fetchTotalSupply(tokenAddresses[0])
            ]);
        } catch (error) {
            elizaLogger.error('Error fetching token details and holders:', error);
            await callback({
                text: "Sorry, there was an error fetching the token holders information. Please try again later.",
                action: "TOP_TOKEN_HOLDERS"
            });
            return false;
        }

        if (tokenDetails.length === 0) {
            await callback({
                text: "Sorry, there was an error fetching the token details. Please try again later.",
                action: "TOP_TOKEN_HOLDERS"
            });
            return false;
        }

        // Calculate USD values and enrich holder data
        const priceUSD = Number(tokenDetails[0].priceUSD);
        elizaLogger.debug(`[topTokenHoldersAction] [${moxieUserId}] Price USD: ${priceUSD}`);

        const moxieUserIds = topTokenHolders.map(holder => holder.moxie_user_id);
        const moxieUserProfiles = await moxieUserService.getUserByMoxieIdMultiple(moxieUserIds);

        const enrichedTokenHolders = topTokenHolders.map(holder => {
            const userProfile = moxieUserProfiles.get(holder.moxie_user_id);
            const username = userProfile?.userName || holder.moxie_user_id;
            const profileLink = `@[${username}|${holder.moxie_user_id}]`;
            const totalBalanceInUsd = holder.total_balance * priceUSD;
            return {
                ...holder,
                profile_link: profileLink,
                total_balance_in_usd: totalBalanceInUsd
            };
        });

        topTokenHolders = enrichedTokenHolders;

        elizaLogger.debug(`[topTokenHoldersAction] [${moxieUserId}] Top token holders: ${JSON.stringify(topTokenHolders)}`);

        // Generate and stream summary
        const newState = await runtime.composeState(message, {
            latestMessage: message.content.text,
            conversation,
            topTokenHolders: JSON.stringify(topTokenHolders),
            tokenDetails: JSON.stringify(tokenDetails),
            tokenTotalSupply: tokenTotalSupply
        }) as State;

        const summaryContext = composeContext({
            state: newState,
            template: topTokenHoldersSummary,
        });

        const summaryStream = streamText({
            runtime,
            context: summaryContext,
            modelClass: ModelClass.MEDIUM,
        });

        for await (const textPart of summaryStream) {
            await callback({text: textPart, action: "TOP_TOKEN_HOLDERS"});
        }

        return true;
    },
    examples: [],
};
