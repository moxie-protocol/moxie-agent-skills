// Import required dependencies and types
import {
    composeContext,
    elizaLogger,
    streamText,
    HandlerCallback,
    generateMessageResponse,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    stringToUuid,
    generateObjectDeprecated,
} from "@senpi-ai/core";
import { portfolioExamples } from "./examples";
import { mutiplePortfolioSummary, portfolioSummary } from "./template";
import { portfolioUserIdsExtractionTemplate } from "../../commonTemplate";
import {
    getMoxiePortfolioInfo,
    SenpiUser,
    senpiUserService,
    getPortfolioData,
    Portfolio,
    getPortfolioV2Data,
    PortfolioV2Data,
    SenpiPortfolioInfo,
    SenpiAgentDBAdapter,
} from "@senpi-ai/senpi-agent-lib";
import {
    getCommonHoldings,
    getSenpiCache,
    getSenpiToUSD,
    getWalletAddresses,
    setSenpiCache,
    handleIneligibleSenpiUsers,
    formatMessages,
} from "../../util";
import { PortfolioUserRequested } from "../../types";

export interface PortfolioSummary {
    [userName: string]: {
        tokenBalances: any[];
        appBalances: any[];
        totalTokenValue: number;
        totalCreatorCoinValue: number;
    };
}

/**
 * Generates a summary of the user's portfolio data
 * Filters and sorts token balances and app balances by value
 */
async function generatePortfolioSummary(
    portfolioV2Data: PortfolioV2Data,
    fanTokenPortfolioData: SenpiPortfolioInfo[],
    senpiUserInfo: SenpiUser,
    message: Memory,
    runtime: IAgentRuntime,
    isSelfPortolioRequested: boolean,
    totalCreatorCoinValue: number
) {
    const portfolioDataFiltered = {
        tokenBalances: portfolioV2Data?.tokenBalances?.byToken?.edges,
    };

    const fanTokenWalletAddresses = [
        ...new Set(
            fanTokenPortfolioData?.flatMap(
                (portfolio) => portfolio.walletAddresses
            )
        ),
    ].map(
        (address: string) => `${address.slice(0, 2)}*****${address.slice(-4)}`
    );

    const tokenAddresses = [
        ...new Set(portfolioV2Data?.metadata?.addresses),
    ].map(
        (address: string) => `${address.slice(0, 2)}*****${address.slice(-4)}`
    );

    // Compose new state with filtered portfolio data
    const newstate = await runtime.composeState(message, {
        portfolio: JSON.stringify(portfolioDataFiltered),
        fanTokenPortfolioData: JSON.stringify(fanTokenPortfolioData),
        senpiUserInfo: JSON.stringify(senpiUserInfo),
        truncatedSenpiUserInfo: JSON.stringify({
            id: senpiUserInfo.id,
            userName: senpiUserInfo.userName,
            name: senpiUserInfo.name,
            bio: senpiUserInfo.bio,
        }),
        tokenAddresses: isSelfPortolioRequested
            ? JSON.stringify(tokenAddresses)
            : JSON.stringify([]),
        fanTokenWalletAddresses: isSelfPortolioRequested
            ? JSON.stringify(fanTokenWalletAddresses)
            : JSON.stringify([]),
        totalCreatorCoinValue: totalCreatorCoinValue,
        message: message.content.text,
    });

    const context = composeContext({
        state: newstate,
        template: portfolioSummary,
    });

    // Generate text summary using AI model
    return streamText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });
}
/**
 * Handles portfolio data fetching and processing for multiple users
 */
export async function handleMultipleUsers(
    senpiUserInfoMultiple: SenpiUser[],
    runtime: IAgentRuntime,
    senpiToUSD: number
) {
    const portfolioSummaries: PortfolioSummary[] = [];
    const commonPortfolioHoldingsMetadata = {};
    for (const userInfo of senpiUserInfoMultiple) {
        const walletAddresses = await getWalletAddresses(userInfo);

        if (!walletAddresses.length) {
            continue;
        }

        const portfolioV2Data = await getPortfolioV2Data(
            walletAddresses,
            ["BASE_MAINNET"],
            userInfo.id,
            runtime
        );

        if (
            !portfolioV2Data ||
            portfolioV2Data?.tokenBalances?.totalBalanceUSD === 0
        ) {
            continue;
        }
        const totalTokenValue =
            portfolioV2Data?.tokenBalances?.totalBalanceUSD || 0;
        let tokenHoldings = [];

        portfolioV2Data.tokenBalances.byToken.edges.forEach((token) => {
            tokenHoldings.push({
                tokenSymbol: token.node.symbol,
                balanceUSD: token.node.balanceUSD,
                balance: token.node.balance,
            });
        });

        const tokenBalancesFiltered =
            portfolioV2Data.tokenBalances.byToken.edges;
        tokenBalancesFiltered.forEach((token) => {
            token.node.holdingPercentage =
                (token.node.balanceUSD * 100) / totalTokenValue;
        });

        const fanTokenPortfolioData = await getMoxiePortfolioInfo(
            userInfo.id,
            runtime
        );
        let totalCreatorCoinValue = 0;
        let fanTokenHoldings = [];

        if (fanTokenPortfolioData && fanTokenPortfolioData.length > 0) {
            fanTokenPortfolioData.forEach((portfolio) => {
                portfolio.totalAmount =
                    portfolio.totalLockedAmount + portfolio.totalUnlockedAmount;
                portfolio.lockedTvlInUSD = portfolio.lockedTvl * senpiToUSD;
                portfolio.unlockedTvlInUSD = portfolio.unlockedTvl * senpiToUSD;
                portfolio.totalTvlInUSD = portfolio.totalTvl * senpiToUSD;
                portfolio.displayLabel =
                    portfolio.fanTokenSenpiUserId &&
                    portfolio.fanTokenSenpiUserId.length > 0
                        ? `@[${portfolio.fanTokenName}|${portfolio.fanTokenSenpiUserId}]`
                        : portfolio.fanTokenName || portfolio.fanTokenSymbol;
                totalCreatorCoinValue += portfolio.totalTvlInUSD || 0;
                fanTokenHoldings.push({
                    fanTokenSymbol: portfolio.fanTokenSymbol,
                    totalTvlInUSD: portfolio.totalTvlInUSD,
                    totalAmount:
                        portfolio.totalLockedAmount +
                        portfolio.totalUnlockedAmount,
                    displayLabel: portfolio.displayLabel,
                });
            });
            fanTokenPortfolioData.forEach((portfolio) => {
                portfolio.holdingPercentage =
                    (portfolio.totalTvlInUSD * 100) / totalCreatorCoinValue;
            });
        }

        portfolioSummaries.push({
            [userInfo.userName]: {
                tokenBalances: tokenBalancesFiltered,
                appBalances: fanTokenPortfolioData,
                totalTokenValue: totalTokenValue,
                totalCreatorCoinValue: totalCreatorCoinValue,
            },
        });
        commonPortfolioHoldingsMetadata[userInfo.userName] = {
            fanTokenHoldings: fanTokenHoldings,
            tokenHoldings: tokenHoldings,
        };
    }

    return { portfolioSummaries, commonPortfolioHoldingsMetadata };
}

// Export the action configuration
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
        "Retrieves current portfolio summary showing token holdings, USD values, and creator coins. Supports multiple users if requested. Don't use this for Social details.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[Portfolio] Starting portfolio fetch");

        try {
            const senpiToUSD = await getSenpiToUSD();
            const senpiUserInfoState = state.senpiUserInfo as SenpiUser;
            const senpiUserId = (state.senpiUserInfo as SenpiUser)?.id;

            let senpiUserInfo: SenpiUser =
                await senpiUserService.getUserByPrivyBearerToken(
                    state.authorizationHeader as string
                );
            let senpiUserInfoMultiple: SenpiUser[] = [];
            let isSelfPortolioRequested = false;

            let requestedSenpiUserIds = (
                message.content.text.match(/@\[[\w\.-]+\|M\d+\]/g) || []
            ).map((match) => match.split("|")[1].replace("]", ""));

            if (requestedSenpiUserIds.length === 0) {
                const previousQuestion = formatMessages({
                    agentId: runtime.agentId,
                    actors: state.actorsData ?? [],
                    messages: state?.recentMessagesData,
                });

                // Initialize or update state
                state = (await runtime.composeState(message, {
                    previousQuestion: previousQuestion,
                    latestMessage: message.content.text,
                    userSenpiId: senpiUserId,
                })) as State;

                const previousQuestionContext = composeContext({
                    state,
                    template: portfolioUserIdsExtractionTemplate,
                });

                const requestedSenpiUserIdsResponse =
                    (await generateObjectDeprecated({
                        runtime,
                        context: previousQuestionContext,
                        modelClass: ModelClass.LARGE,
                    })) as PortfolioUserRequested;

                requestedSenpiUserIds =
                    requestedSenpiUserIdsResponse.requestedUsers;
            }

            elizaLogger.info(
                `[Portfolio] Requested Senpi user IDs: ${requestedSenpiUserIds}`
            );

            if (requestedSenpiUserIds?.length === 0) {
                await callback({
                    text: "I couldn't find any users for whom portfolio information is requested. Can you try again by mentioning the users in your message?",
                    action: "PORTFOLIO_ERROR",
                });
                return false;
            }

            if (
                requestedSenpiUserIds?.length === 1 &&
                requestedSenpiUserIds[0] === senpiUserId
            ) {
                isSelfPortolioRequested = true;
            }

            if (requestedSenpiUserIds?.length > 1) {
                if (requestedSenpiUserIds?.length > 3) {
                    await callback({
                        text: "Its not possible to process more than 3 users at a time. Please specify a single user or fewer users. (less than 3)",
                        action: "PORTFOLIO_ERROR",
                    });
                    return false;
                }

                // Fetch user info for all requested IDs
                const ineligibleSenpiUsers = [];
                const eligibleSenpiIds = [];

                let userInfoBatchOutput;
                try {
                    userInfoBatchOutput =
                        await senpiUserService.getUserBySenpiIdMultipleTokenGate(
                            requestedSenpiUserIds,
                            state.authorizationHeader as string,
                            stringToUuid("PORTFOLIOS")
                        );
                } catch (error) {
                    elizaLogger.error(
                        "Error fetching user info batch:",
                        error instanceof Error ? error.stack : error
                    );
                    await callback({
                        text: "There was an error processing your request. Please try again later.",
                        action: "CREATOR_COIN_BALANCE_ERROR",
                    });
                    return false;
                }

                for (const userInfo of userInfoBatchOutput.users) {
                    if (userInfo.errorDetails) {
                        ineligibleSenpiUsers.push(userInfo.errorDetails);
                    } else {
                        eligibleSenpiIds.push(userInfo.user.id);
                        senpiUserInfoMultiple.push(userInfo.user);
                    }
                }

                if (ineligibleSenpiUsers.length > 0) {
                    await handleIneligibleSenpiUsers(
                        ineligibleSenpiUsers,
                        callback
                    );
                    return false;
                }

                const { portfolioSummaries, commonPortfolioHoldingsMetadata } =
                    await handleMultipleUsers(
                        senpiUserInfoMultiple,
                        runtime,
                        senpiToUSD
                    );
                const {
                    filteredCommonFanTokenHoldings,
                    filteredCommonTokenHoldings,
                } = getCommonHoldings(
                    senpiUserInfoMultiple,
                    commonPortfolioHoldingsMetadata
                );
                const newstate = await runtime.composeState(message, {
                    portfolioSummaries: JSON.stringify(portfolioSummaries),
                    isSelfPortolioRequested: JSON.stringify(false),
                    message: message.content.text,
                    filteredCommonFanTokenHoldings: JSON.stringify(
                        filteredCommonFanTokenHoldings
                    ),
                    filteredCommonTokenHoldings: JSON.stringify(
                        filteredCommonTokenHoldings
                    ),
                    ineligibleSenpiUsers: JSON.stringify(ineligibleSenpiUsers),
                });

                const context = composeContext({
                    state: newstate,
                    template: mutiplePortfolioSummary,
                });

                const summaryStream = streamText({
                    runtime,
                    context,
                    modelClass: ModelClass.MEDIUM,
                });

                for await (const textPart of summaryStream) {
                    callback({
                        text: textPart,
                        action: "PORTFOLIO_MULTIPLE_SUCCESS",
                    });
                }

                return true;
            }

            elizaLogger.info(
                "[Portfolio-TokenGate] isSelfPortolioRequested",
                isSelfPortolioRequested,
                "requestedSenpiUserIds",
                requestedSenpiUserIds
            );

            if (
                !isSelfPortolioRequested &&
                requestedSenpiUserIds?.length === 1
            ) {
                const ineligibleSenpiUsers = [];
                const eligibleSenpiIds = [];
                let userInfoBatchOutput;
                try {
                    userInfoBatchOutput =
                        await senpiUserService.getUserBySenpiIdMultipleTokenGate(
                            requestedSenpiUserIds,
                            state.authorizationHeader as string,
                            stringToUuid("PORTFOLIOS")
                        );
                } catch (error) {
                    elizaLogger.error(
                        "Error fetching user info batch:",
                        error instanceof Error ? error.stack : error
                    );
                    await callback({
                        text: "There was an error processing your request. Please try again later.",
                        action: "CREATOR_COIN_BALANCE_ERROR",
                    });
                    return false;
                }

                for (const userInfo of userInfoBatchOutput.users) {
                    if (userInfo.errorDetails) {
                        ineligibleSenpiUsers.push(userInfo.errorDetails);
                    } else {
                        eligibleSenpiIds.push(userInfo.user.id);
                        senpiUserInfo = userInfo.user;
                    }
                }
                if (ineligibleSenpiUsers.length > 0) {
                    await handleIneligibleSenpiUsers(
                        ineligibleSenpiUsers,
                        callback
                    );
                    return false;
                }
            }

            // Get wallet addresses for single user
            const walletAddresses = await getWalletAddresses(senpiUserInfo);

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

            // Fetch fresh portfolio data
            const portfolioV2Data = await getPortfolioV2Data(
                walletAddresses,
                ["BASE_MAINNET"],
                senpiUserInfo?.id,
                runtime
            );
            const totalTokenValue =
                portfolioV2Data?.tokenBalances?.totalBalanceUSD || 0;
            portfolioV2Data?.tokenBalances?.byToken?.edges?.forEach((token) => {
                token.node.holdingPercentage =
                    (token?.node?.balanceUSD * 100) / totalTokenValue;
            });
            const fanTokenPortfolioData = await getMoxiePortfolioInfo(
                senpiUserInfo?.id,
                runtime
            );
            let totalCreatorCoinValue = 0;
            if (fanTokenPortfolioData && fanTokenPortfolioData.length > 0) {
                fanTokenPortfolioData.forEach((portfolio) => {
                    portfolio.totalAmount =
                        portfolio.totalLockedAmount +
                        portfolio.totalUnlockedAmount;
                    portfolio.lockedTvlInUSD = portfolio.lockedTvl * senpiToUSD;
                    portfolio.unlockedTvlInUSD =
                        portfolio.unlockedTvl * senpiToUSD;
                    portfolio.totalTvlInUSD = portfolio.totalTvl * senpiToUSD;
                    portfolio.displayLabel =
                        portfolio.fanTokenSenpiUserId &&
                        portfolio.fanTokenSenpiUserId.length > 0
                            ? `@[${portfolio.fanTokenName}|${portfolio.fanTokenSenpiUserId}]`
                            : portfolio.fanTokenName ||
                              portfolio.fanTokenSymbol;
                    totalCreatorCoinValue += portfolio.totalTvlInUSD || 0;
                });
                fanTokenPortfolioData.forEach((portfolio) => {
                    portfolio.holdingPercentage =
                        (portfolio.totalTvlInUSD * 100) / totalCreatorCoinValue;
                });
            }

            if (
                !portfolioV2Data ||
                portfolioV2Data?.tokenBalances?.totalBalanceUSD === 0
            ) {
                elizaLogger.error(
                    "[Portfolio] No Tokens in the portfolio for this wallet address: ",
                    walletAddresses,
                    " senpiUser :",
                    JSON.stringify(senpiUserInfo)
                );
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

            const summaryStream = await generatePortfolioSummary(
                portfolioV2Data,
                fanTokenPortfolioData,
                senpiUserInfo,
                message,
                runtime,
                isSelfPortolioRequested,
                totalCreatorCoinValue
            );

            elizaLogger.success(
                "[Portfolio] Successfully generated portfolio summary"
            );

            for await (const textPart of summaryStream) {
                callback({ text: textPart, action: "PORTFOLIO_SUCCESS" });
            }

            return true;
        } catch (error) {
            elizaLogger.error(
                "[Portfolio] Error fetching portfolio:",
                error,
                error?.stack
            );
            if (callback) {
                await callback({
                    text: ` There is some problem while fetching the portfolio. Please try again later.`,
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
