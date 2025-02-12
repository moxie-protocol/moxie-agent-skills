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
} from "@moxie-protocol/core";
import { portfolioExamples } from "./examples";
import { getPortfolioData } from "../../services/zapperService";
import { portfolioSummary } from "./template";
import {
    AppBalance,
    AppTokenPosition,
    Portfolio,
    TokenBalance,
} from "../../types";
import { MoxieUser, moxieUserService } from "@moxie-protocol/moxie-lib";
import { getMoxieCache, setMoxieCache } from "../../util";

async function generatePortfolioSummary(
    portfolioData: Portfolio,
    message: Memory,
    runtime: IAgentRuntime
) {
    const tokenBalancesFiltered = [...portfolioData.tokenBalances]
        .filter((token) => token.token.balanceUSD > 0.01)
        .sort((a, b) => b.token.balanceUSD - a.token.balanceUSD)
        .slice(0, 20);

    const appBalancesFiltered = [...portfolioData.appBalances]
        .filter((app) => app.balanceUSD > 0.01)
        .sort((a, b) => b.balanceUSD - a.balanceUSD)
        .slice(0, 20);

    const portfolioDataFiltered = {
        tokenBalances: tokenBalancesFiltered,
        appBalances: appBalancesFiltered,
    };

    console.log(
        "portfolioDataFiltered--generatePortfolioSummary-->",
        portfolioDataFiltered
    );
    const newstate = await runtime.composeState(message, {
        portfolio: JSON.stringify(portfolioDataFiltered),
        message: message.content.text,
    });

    const context = composeContext({
        state: newstate,
        template: portfolioSummary,
    });

    return await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });
}

async function getWalletAddresses(userInfo: MoxieUser) {
    const addresses =
        userInfo.wallets.map((wallet) => wallet?.walletAddress) || [];
    const vestingAddresses =
        userInfo.vestingContracts?.map(
            (contract) => contract?.vestingContractAddress
        ) || [];
    return [...addresses, ...vestingAddresses];
}

async function handleMultipleUsers(
    moxieUserInfoMultiple: MoxieUser[],
    message: Memory,
    runtime: IAgentRuntime
) {
    // Get all portfolio data first
    const portfolioSummaries = [];
    for (const userInfo of moxieUserInfoMultiple) {
        const walletAddresses = await getWalletAddresses(userInfo);

        if (!walletAddresses.length) {
            continue;
        }

        const portfolioData = await getPortfolioData(
            walletAddresses,
            ["BASE_MAINNET"],
            userInfo.id,
            runtime
        );
        if (
            !portfolioData ||
            (portfolioData.tokenBalances.length === 0 &&
                portfolioData.appBalances.length === 0)
        ) {
            continue;
        }
        const tokenBalancesFiltered = portfolioData.tokenBalances
            .filter((token) => token.token.balanceUSD > 0.01)
            .sort((a, b) => b.token.balanceUSD - a.token.balanceUSD)
            .slice(0, 20);

        const appBalancesFiltered = portfolioData.appBalances
            .filter((app) =>
                app.products.some((prod) =>
                    prod.assets.some((asset) => asset.balanceUSD > 0.01)
                )
            )
            .sort((a, b) => {
                const aMaxBalance = Math.max(
                    ...a.products.flatMap((p) =>
                        p.assets.map((asset) => asset.balanceUSD || 0)
                    )
                );
                const bMaxBalance = Math.max(
                    ...b.products.flatMap((p) =>
                        p.assets.map((asset) => asset.balanceUSD || 0)
                    )
                );
                return bMaxBalance - aMaxBalance;
            })
            .slice(0, 20);

        portfolioSummaries.push({
            tokenBalances: tokenBalancesFiltered,
            appBalances: appBalancesFiltered,
        });
    }
    return portfolioSummaries;
}

async function handleCachedPortfolio(
    moxieUserInfoRaw: string,
    message: Memory,
    runtime: IAgentRuntime
) {
    const moxieUserInfoMomory = JSON.parse(moxieUserInfoRaw as string);
    const portfolioData = await getPortfolioData(
        [],
        ["BASE_MAINNET"],
        moxieUserInfoMomory?.id,
        runtime
    );
    return await generatePortfolioSummary(portfolioData, message, runtime);
}

export default {
    name: "PORTFOLIO",
    similes: [
        "PORTFOLIO",
        "PORTFOLIO_SUMMARY",
        "TOTAL_BALANCE",
        "ALL_POSITIONS",
        "ASSET_OVERVIEW",
        "HOLDINGS_SUMMARY",
        "WALLET_BALANCE",
        "INVESTMENT_SUMMARY",
        "ASSET_POSITIONS",
        "PORTFOLIO_OVERVIEW",
        "PORTFOLIO_STATUS",
    ],
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[Portfolio] Validating request");
        return true;
    },
    description:
        "Get portfolio summary showing token holdings with amounts, USD values and percentages, plus creator coin holdings if present. Includes total portfolio value and relevant insights. It also compute portfolio for multiple users if requested",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[Portfolio] Starting portfolio fetch");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            let moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;
            let moxieUserInfoMultiple: MoxieUser[];

            const userPortfolioCacheKey = `User-PORTFOLIO-${moxieUserInfo?.id}`;

            // Extract moxieUserId from message
            let requestedMoxieUserIds = (
                message.content.text.match(/@\[[\w\.-]+\|M\d+\]/g) || []
            ).map((match) => match.split("|")[1].replace("]", ""));

            if (requestedMoxieUserIds?.length > 0) {
                moxieUserInfoMultiple = await Promise.all(
                    requestedMoxieUserIds.map((id) =>
                        moxieUserService.getUserByMoxieId(id)
                    )
                );
                moxieUserInfo = moxieUserInfoMultiple[0]; // Keep first one for backwards compatibility

                if (
                    !moxieUserInfo ||
                    moxieUserInfoMultiple.some((user) => !user)
                ) {
                    await callback({
                        text: "Could not find one or more users with the provided Moxie IDs",
                        action: "PORTFOLIO_ERROR",
                    });
                    return false;
                }

                if (moxieUserInfoMultiple.length > 1) {
                    const portfolioSummaries = await handleMultipleUsers(
                        moxieUserInfoMultiple,
                        message,
                        runtime
                    );

                    const newstate = await runtime.composeState(message, {
                        portfolioSummaries: JSON.stringify(portfolioSummaries),
                        message: message.content.text,
                    });

                    const context = composeContext({
                        state: newstate,
                        template: portfolioSummary,
                    });

                    const summary = await generateText({
                        runtime,
                        context,
                        modelClass: ModelClass.MEDIUM,
                    });

                    await callback({
                        text: summary,
                        action: "PORTFOLIO_MULTIPLE_SUCCESS",
                    });
                    return true;
                }
            } else {
                const moxieUserInfoRaw = await getMoxieCache(
                    userPortfolioCacheKey,
                    runtime
                );
                if (moxieUserInfoRaw) {
                    const summary = await handleCachedPortfolio(
                        moxieUserInfoRaw,
                        message,
                        runtime
                    );
                    elizaLogger.success(
                        "[Portfolio] Successfully generated portfolio summary"
                    );
                    await callback({
                        text: summary,
                        action: "PORTFOLIO_MEMORY_SUCCESS",
                    });
                    return true;
                }
            }

            const walletAddresses = await getWalletAddresses(moxieUserInfo);

            elizaLogger.log(
                `[Portfolio] Processing wallet address: ${walletAddresses}`
            );

            if (!walletAddresses) {
                await callback({
                    text: "No wallet address linked to your account",
                    action: "PORTFOLIO_ERROR",
                });
                return false;
            }

            elizaLogger.log("[Portfolio] Fetching portfolio data");

            const cacheResponeKey = `PORTFOLIO_RESPONSE-${moxieUserInfo?.id}`;
            const cacheResponse = await getMoxieCache(cacheResponeKey, runtime);
            if (cacheResponse) {
                elizaLogger.log("[Portfolio] Using cached portfolio");
                await callback({
                    text: cacheResponse,
                    action: "PORTFOLIO_CACHE_SUCCESS",
                });
                return true;
            }

            const portfolioData = await getPortfolioData(
                walletAddresses,
                ["BASE_MAINNET"],
                moxieUserInfo?.id,
                runtime
            );

            if (
                !portfolioData ||
                (portfolioData.tokenBalances.length === 0 &&
                    portfolioData.appBalances.length === 0)
            ) {
                await callback({
                    text: "I couldn't find any Tokens in the portfolio for this wallet address",
                    action: "PORTFOLIO_ERROR",
                });
                return false;
            }

            elizaLogger.success(
                "[Portfolio] Portfolio data fetched successfully"
            );
            elizaLogger.log("[Portfolio] Generating portfolio summary");

            const summary = await generatePortfolioSummary(
                portfolioData,
                message,
                runtime
            );

            elizaLogger.success(
                "[Portfolio] Successfully generated portfolio summary"
            );
            setMoxieCache(summary, cacheResponeKey, runtime);
            setMoxieCache(
                JSON.stringify(moxieUserInfo),
                userPortfolioCacheKey,
                runtime
            );

            await callback({
                text: summary,
                action: "PORTFOLIO_SUCCESS",
            });
            return true;
        } catch (error) {
            elizaLogger.error(
                "[Portfolio] Error fetching portfolio:",
                error,
                error?.stack
            );
            if (callback) {
                await callback({
                    text: `Error fetching price: ${error.message}`,
                    content: { error: error.message },
                    action: "PORTFOLIO_ERROR",
                });
            }
            return false;
        }
    },
    examples: portfolioExamples,
    template: portfolioSummary,
} as Action;
