// Import required dependencies and types from core package
import {
    composeContext,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    stringToUuid,
    generateObjectDeprecated,
    type Action,
} from "@senpi-ai/core";
// Import local dependencies
import { fanTokenPortfolioExamples } from "./examples";
import { fanTokenPortfolioSummary } from "./template";
import { streamText } from "@senpi-ai/core";
import {
    SenpiUser,
    senpiUserService,
    getMoxiePortfolioInfo,
    SenpiAgentDBAdapter,
} from "@senpi-ai/senpi-agent-lib";
import {
    getCommonHoldings,
    getSenpiCache,
    getSenpiToUSD,
    setSenpiCache,
    handleIneligibleSenpiUsers,
    formatMessages,
} from "../../util";
import { PortfolioUserRequested } from "../../types";
import { portfolioUserIdsExtractionTemplate } from "../../commonTemplate";

/**
 * Generates a summary of the user's fan token portfolio
 * @param portfolioData The user's portfolio data from Zapper
 * @param message The original message that triggered this action
 * @param runtime The agent runtime instance
 * @returns Generated text summary of fan token portfolio
 */
async function generateFanTokenPortfolioSummary(
    portfolioData: any,
    message: Memory,
    runtime: IAgentRuntime,
    senpiUserInfo: SenpiUser,
    isSelfPortolioRequested: boolean,
    totalCreatorCoinValue: number
) {
    // Create new state with fan token portfolio data

    const fanTokenWalletAddresses = [
        ...new Set(
            portfolioData?.flatMap((portfolio) => portfolio.walletAddresses)
        ),
    ].map(
        (address: string) => `${address.slice(0, 2)}*****${address.slice(-4)}`
    );

    const newstate = await runtime.composeState(message, {
        fanTokenPortfolio: JSON.stringify(portfolioData),
        message: message.content.text,
        senpiUserInfo: JSON.stringify(senpiUserInfo),
        fanTokenWalletAddresses: isSelfPortolioRequested
            ? JSON.stringify(fanTokenWalletAddresses)
            : JSON.stringify([]),
        totalCreatorCoinValue: JSON.stringify(totalCreatorCoinValue),
    });

    // Compose context for text generation
    const context = composeContext({
        state: newstate,
        template: fanTokenPortfolioSummary,
    });

    // Generate and return portfolio summary text
    return streamText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });
}

// Export action configuration
export default {
    name: "CREATOR_COIN_BALANCE",
    // Define similar terms that can trigger this action
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
    // Validation function for incoming requests
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[FanTokenPortfolio] Validating request");
        return true;
    },
    description:
        "Provides a summary of creator coin holdings, including USD values, percentage allocations, and total creator coin balance. Use it when speficially requested creator coins.",
    // Main handler function for processing fan token portfolio requests
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[FanTokenPortfolio] Starting portfolio fetch");

        try {
            // Get user info from state
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
                `[Creator coin portfolio] Requested Senpi user IDs: ${requestedSenpiUserIds}`
            );

            if (requestedSenpiUserIds?.length === 0) {
                await callback({
                    text: "I couldn't find any users for whom creator coin portfolio information is requested. Can you try again by mentioning the users in your message?",
                    action: "CREATOR_COIN_BALANCE_ERROR",
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
                        text: "Its not possible to process more than 3 users at a time. Please specify a single user or fewer users (less than 3).",
                        action: "CREATOR_COIN_BALANCE_ERROR",
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

                if (senpiUserInfoMultiple.some((user) => !user)) {
                    await callback({
                        text: "Could not find one or more provided users",
                        action: "CREATOR_COIN_BALANCE_ERROR",
                    });
                    return false;
                }

                if (ineligibleSenpiUsers.length > 0) {
                    await handleIneligibleSenpiUsers(
                        ineligibleSenpiUsers,
                        callback
                    );
                    return false;
                }

                const portfolioSummaries = {};
                await Promise.all(
                    senpiUserInfoMultiple.map(async (user) => {
                        let totalCreatorCoinValue = 0;
                        let fanTokenHoldings = [];
                        const portfolioInfo = await getMoxiePortfolioInfo(
                            user.id,
                            runtime
                        );
                        if (portfolioInfo && portfolioInfo.length > 0) {
                            portfolioInfo.forEach((portfolio) => {
                                portfolio.totalAmount =
                                    portfolio.totalLockedAmount +
                                    portfolio.totalUnlockedAmount;
                                portfolio.lockedTvlInUSD =
                                    portfolio.lockedTvl * senpiToUSD;
                                portfolio.unlockedTvlInUSD =
                                    portfolio.unlockedTvl * senpiToUSD;
                                portfolio.totalTvlInUSD =
                                    portfolio.totalTvl * senpiToUSD;
                                portfolio.displayLabel =
                                    portfolio.fanTokenSenpiUserId &&
                                    portfolio.fanTokenSenpiUserId.length > 0
                                        ? `@[${portfolio.fanTokenName}|${portfolio.fanTokenSenpiUserId}]`
                                        : portfolio.fanTokenName ||
                                          portfolio.fanTokenSymbol;
                                totalCreatorCoinValue +=
                                    portfolio.totalTvlInUSD || 0;
                                fanTokenHoldings.push({
                                    fanTokenSymbol: portfolio.fanTokenSymbol,
                                    totalTvlInUSD: portfolio.totalTvlInUSD,
                                    totalAmount:
                                        portfolio.totalLockedAmount +
                                        portfolio.totalUnlockedAmount,
                                    displayLabel: portfolio.displayLabel,
                                });
                            });
                            portfolioInfo.forEach((portfolio) => {
                                portfolio.holdingPercentage =
                                    (portfolio.totalTvlInUSD * 100) /
                                    totalCreatorCoinValue;
                            });
                            portfolioSummaries[user.userName] = {
                                portfolioInfo,
                                totalCreatorCoinValue,
                                fanTokenHoldings,
                            };
                        }
                    })
                );
                const { filteredCommonFanTokenHoldings } = getCommonHoldings(
                    senpiUserInfoMultiple,
                    portfolioSummaries
                );

                const newstate = await runtime.composeState(message, {
                    portfolioSummaries: JSON.stringify(portfolioSummaries),
                    commonHoldings: JSON.stringify(
                        filteredCommonFanTokenHoldings
                    ),
                    isSelfPortolioRequested: JSON.stringify(false),
                    message: message.content.text,
                });

                const context = composeContext({
                    state: newstate,
                    template: fanTokenPortfolioSummary,
                });

                const summaryStream = streamText({
                    runtime,
                    context,
                    modelClass: ModelClass.MEDIUM,
                });

                for await (const textPart of summaryStream) {
                    callback({
                        text: textPart,
                        action: "CREATOR_COIN_BALANCE_MULTIPLE_SUCCESS",
                    });
                }

                return true;
            }

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

            // Get all wallet addresses including vesting contracts
            const addresses =
                senpiUserInfo.wallets.map((wallet) => wallet?.walletAddress) ||
                [];
            const vestingContractAddresses =
                senpiUserInfo?.vestingContracts?.map(
                    (contract) => contract?.vestingContractAddress
                ) || [];
            const walletAddresses = [...addresses, ...vestingContractAddresses];
            elizaLogger.log(
                `[FanTokenPortfolio] Processing wallet address: ${walletAddresses}`
            );

            if (!walletAddresses) {
                await callback({
                    text: "No wallet address linked to your account",
                    action: "CREATOR_COIN_BALANCE_ERROR",
                });
                return false;
            }

            elizaLogger.log("[FanTokenPortfolio] Fetching portfolio data");

            // Fetch fresh portfolio data
            let totalCreatorCoinValue = 0;
            const portfolioData = await getMoxiePortfolioInfo(
                senpiUserInfo?.id,
                runtime
            );
            if (!portfolioData || portfolioData.length === 0) {
                await callback({
                    text: "I couldn't find any Creator Coins in the portfolio for this wallet address",
                    action: "CREATOR_COIN_BALANCE_ERROR",
                });
                return false;
            }
            portfolioData.forEach((portfolio) => {
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
            });
            portfolioData.forEach((portfolio) => {
                portfolio.holdingPercentage =
                    (portfolio.totalTvlInUSD * 100) / totalCreatorCoinValue;
            });

            elizaLogger.success(
                "[FanTokenPortfolio] Portfolio data fetched successfully"
            );
            elizaLogger.log("[FanTokenPortfolio] Generating portfolio summary");

            // Generate portfolio summary
            const responseStream = await generateFanTokenPortfolioSummary(
                portfolioData,
                message,
                runtime,
                senpiUserInfo,
                isSelfPortolioRequested,
                totalCreatorCoinValue
            );

            // Cache results and return success
            elizaLogger.success(
                "[FanTokenPortfolio] Successfully generated portfolio summary"
            );
            for await (const textPart of responseStream) {
                callback({
                    text: textPart,
                    action: "CREATOR_COIN_BALANCE_SUCCESS",
                });
            }
            return true;
        } catch (error) {
            // Handle errors
            elizaLogger.error(
                "[FanTokenPortfolio] Error fetching portfolio:",
                error,
                error?.stack
            );
            if (callback) {
                await callback({
                    text: ` There is some problem while fetching the creator coin balance. Please try again later.`,
                    content: { error: error.message },
                    action: "CREATOR_COIN_BALANCE_ERROR",
                });
            }
            return false;
        }
    },
    examples: fanTokenPortfolioExamples,
    template: fanTokenPortfolioSummary,
} as Action;
