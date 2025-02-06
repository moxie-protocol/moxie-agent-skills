import {
    composeContext,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import { fanTokenPortfolioExamples } from "./examples";
import { getPortfolioData } from "../../services/zapperService";
import { fanTokenPortfolioSummary } from "./template";
import { Portfolio } from "../../types";
import { MoxieUser, moxieUserService } from "@elizaos/moxie-lib";
import { getMoxieCache, setMoxieCache } from "../../util";

async function generateFanTokenPortfolioSummary(
    portfolioData: Portfolio,
    message: Memory,
    runtime: IAgentRuntime
) {
    const newstate = await runtime.composeState(message, {
        fanTokenPortfolio: JSON.stringify(portfolioData.appBalances),
        message: message.content.text
    });

    const context = composeContext({
        state: newstate,
        template: fanTokenPortfolioSummary,
    });

    return await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });
}

export default {
    name: "CREATOR_COIN_BALANCE",
    similes: [
        "CREATOR_COIN",
        "CREATOR_COIN_BALANCE",
        "CREATOR_COIN_PRICE",
        "CREATOR_COIN_POSITION",
        "FAN_TOKEN",
        "FAN_TOKEN_BALANCE",
        "FAN_TOKEN_POSITION",
        "FAN_TOKEN_PRICE",
    ],
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[FanTokenPortfolio] Validating request");
        return true;
    },
    description: "Get balance summary showing creator coin holdings with amounts, USD values and percentages. Lists top creator coins by value with percentage allocation and total creator coin balance in USD and Moxie",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[FanTokenPortfolio] Starting portfolio fetch");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            let moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;
            const userFanTokenPortfolioCacheKey = `User-FAN-TOKEN-PORTFOLIO-${moxieUserInfo?.id}`;

            // Extract moxieUserId from message
            let requestedMoxieUserId = message.content.text.match(/@\[[\w\.-]+\|M\d+\]/)?.[0].split("|")[1].replace("]", "");
            if (requestedMoxieUserId) {
                moxieUserInfo = await moxieUserService.getUserByMoxieId(requestedMoxieUserId);
                if (!moxieUserInfo) {
                    await callback({
                        text: "Could not find user with that Moxie ID",
                        action: "CREATOR_COIN_BALANCE_ERROR"
                    });
                    return false;
                }
            } else {
                const moxieUserInfoRaw = await getMoxieCache(userFanTokenPortfolioCacheKey, runtime);
                if(moxieUserInfoRaw) {
                    const moxieUserInfoMomory = JSON.parse(moxieUserInfoRaw as string);
                    const portfolioData = await getPortfolioData([], ["BASE_MAINNET"], moxieUserInfoMomory?.id, runtime);
                    const summary = await generateFanTokenPortfolioSummary(portfolioData, message, runtime);
                    elizaLogger.success("[FanTokenPortfolio] Successfully generated portfolio summary");
                    await callback({ text: summary, action: "CREATOR_COIN_BALANCE_MEMORY_SUCCESS" });
                    return true;
                }
            }

            const addresses = moxieUserInfo.wallets.map(wallet => wallet?.walletAddress) || [];
            const vestingContractAddresses = moxieUserInfo?.vestingContracts?.map(contract => contract?.vestingContractAddress) || [];
            const walletAddresses = [...addresses, ...vestingContractAddresses];
            elizaLogger.log(`[FanTokenPortfolio] Processing wallet address: ${walletAddresses}`);

            if (!walletAddresses) {
                await callback({
                    text: "No wallet address linked to your account",
                    action: "CREATOR_COIN_BALANCE_ERROR"
                });
                return false;
            }

            elizaLogger.log("[FanTokenPortfolio] Fetching portfolio data");

            const cacheResponeKey = `CREATOR_COIN_BALANCE-${moxieUserInfo?.id}`;
            const cacheResponse = await getMoxieCache(cacheResponeKey, runtime);
            if(cacheResponse) {
                elizaLogger.log("[FanTokenPortfolio] Using cached portfolio");
                await callback({ text: cacheResponse, action: "CREATOR_COIN_BALANCE_CACHE_SUCCESS" });
                return true;
            }

            const portfolioData = await getPortfolioData(walletAddresses, ["BASE_MAINNET"], moxieUserInfo?.id, runtime);
            if(!portfolioData || portfolioData.appBalances.length === 0) {
                await callback({
                    text: "I couldn't find any Fan Tokens in the portfolio for this wallet address",
                    action: "CREATOR_COIN_BALANCE_ERROR"
                });
                return false;
            }

            elizaLogger.success("[FanTokenPortfolio] Portfolio data fetched successfully");
            elizaLogger.log("[FanTokenPortfolio] Generating portfolio summary");

            const response = await generateFanTokenPortfolioSummary(portfolioData, message, runtime);

            elizaLogger.success("[FanTokenPortfolio] Successfully generated portfolio summary");
            setMoxieCache(response, cacheResponeKey, runtime);
            setMoxieCache(JSON.stringify(moxieUserInfo), userFanTokenPortfolioCacheKey, runtime);
            await callback({ text: response, action: "CREATOR_COIN_BALANCE_SUCCESS" });
            return true;

        } catch (error) {
            elizaLogger.error("[FanTokenPortfolio] Error fetching portfolio:", error, error?.stack);
            if (callback) {
                await callback({
                    text: `Error fetching price: ${error.message}`,
                    content: { error: error.message },
                    action: "CREATOR_COIN_BALANCE_ERROR"
                });
            }
            return false;
        }
    },
    examples: fanTokenPortfolioExamples,
    template: fanTokenPortfolioSummary,
} as Action;
