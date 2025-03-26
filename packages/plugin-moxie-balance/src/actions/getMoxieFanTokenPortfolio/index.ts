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
} from "@moxie-protocol/core";
// Import local dependencies
import { fanTokenPortfolioExamples } from "./examples";
import { fanTokenPortfolioSummary } from "./template";
import { streamText } from "@moxie-protocol/core";
import {
    MoxieUser,
    moxieUserService,
    getMoxiePortfolioInfo,
    MoxieAgentDBAdapter,
} from "@moxie-protocol/moxie-agent-lib";
import {
    getCommonHoldings,
    getMoxieCache,
    getMoxieToUSD,
    setMoxieCache,
    handleIneligibleMoxieUsers,
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
    moxieUserInfo: MoxieUser,
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
        moxieUserInfo: JSON.stringify(moxieUserInfo),
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
            const moxieToUSD = await getMoxieToUSD();
            const moxieUserInfoState = state.moxieUserInfo as MoxieUser;
            const moxieUserId = (state.moxieUserInfo as MoxieUser)?.id;

            let moxieUserInfo: MoxieUser =
                await moxieUserService.getUserByPrivyBearerToken(state.authorizationHeader as string);
            let moxieUserInfoMultiple: MoxieUser[] = [];
            let isSelfPortolioRequested = false;

            let requestedMoxieUserIds = (message.content.text.match(/@\[[\w\.-]+\|M\d+\]/g) || [])
                 .map(match => match.split("|")[1].replace("]", ""));

            if (requestedMoxieUserIds.length === 0) {
                const previousQuestion = formatMessages({
                    agentId: runtime.agentId,
                    actors: state.actorsData ?? [],
                    messages: state?.recentMessagesData,
                });

                // Initialize or update state
                state = (await runtime.composeState(message, {
                    previousQuestion: previousQuestion,
                    latestMessage: message.content.text,
                    userMoxieId: moxieUserId,
                })) as State;

                const previousQuestionContext = composeContext({
                    state,
                    template: portfolioUserIdsExtractionTemplate,
                });

                const requestedMoxieUserIdsResponse =
                    (await generateObjectDeprecated({
                        runtime,
                        context: previousQuestionContext,
                        modelClass: ModelClass.LARGE,
                    })) as PortfolioUserRequested;

                requestedMoxieUserIds = requestedMoxieUserIdsResponse.requestedUsers;
            }

            elizaLogger.info(
                `[Creator coin portfolio] Requested Moxie user IDs: ${requestedMoxieUserIds}`
            );

            if (requestedMoxieUserIds?.length === 0) {
                await callback({
                    text: "I couldn't find any users for whom creator coin portfolio information is requested. Can you try again by mentioning the users in your message?",
                    action: "CREATOR_COIN_BALANCE_ERROR",
                });
                return false;
            }

            if (
                requestedMoxieUserIds?.length === 1 &&
                requestedMoxieUserIds[0] === moxieUserId
            ) {
                isSelfPortolioRequested = true;
            }

            if (requestedMoxieUserIds?.length > 1) {
                if (requestedMoxieUserIds?.length > 3) {
                    await callback({
                        text: "Its not possible to process more than 3 users at a time. Please specify a single user or fewer users (less than 3).",
                        action: "CREATOR_COIN_BALANCE_ERROR",
                    });
                    return false;
                }

                // Fetch user info for all requested IDs

                const ineligibleMoxieUsers = [];
                const eligibleMoxieIds = [];
                const userInfoBatchOutput = await moxieUserService.getUserByMoxieIdMultipleTokenGate(requestedMoxieUserIds, state.authorizationHeader as string, stringToUuid("PORTFOLIOS"));
                for (const userInfo of userInfoBatchOutput.users) {
                    if (userInfo.errorDetails) {
                        ineligibleMoxieUsers.push(userInfo.errorDetails);
                    } else {
                        eligibleMoxieIds.push(userInfo.user.id);
                        moxieUserInfoMultiple.push(userInfo.user);
                    }
                }


                if (moxieUserInfoMultiple.some((user) => !user)) {
                    await callback({
                        text: "Could not find one or more provided users",
                        action: "CREATOR_COIN_BALANCE_ERROR",
                    });
                    return false;
                }

                if (ineligibleMoxieUsers.length > 0) {
                    await handleIneligibleMoxieUsers(
                        ineligibleMoxieUsers,
                        callback
                    );
                    return false;
                }

                const portfolioSummaries = {};
                await Promise.all(
                    moxieUserInfoMultiple.map(async (user) => {
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
                                    portfolio.lockedTvl * moxieToUSD;
                                portfolio.unlockedTvlInUSD =
                                    portfolio.unlockedTvl * moxieToUSD;
                                portfolio.totalTvlInUSD =
                                    portfolio.totalTvl * moxieToUSD;
                                portfolio.displayLabel =
                                    portfolio.fanTokenMoxieUserId &&
                                    portfolio.fanTokenMoxieUserId.length > 0
                                        ? `@[${portfolio.fanTokenName}|${portfolio.fanTokenMoxieUserId}]`
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
                    moxieUserInfoMultiple,
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
                requestedMoxieUserIds?.length === 1
            ) {
                const ineligibleMoxieUsers = [];
                const eligibleMoxieIds = [];
                const userInfoBatchOutput = await moxieUserService.getUserByMoxieIdMultipleTokenGate(requestedMoxieUserIds, state.authorizationHeader as string, stringToUuid("PORTFOLIOS"));
                for (const userInfo of userInfoBatchOutput.users) {
                    if (userInfo.errorDetails) {
                        ineligibleMoxieUsers.push(userInfo.errorDetails);
                    } else {
                        eligibleMoxieIds.push(userInfo.user.id);
                        moxieUserInfo = userInfo.user;
                    }
                }
                if (ineligibleMoxieUsers.length > 0) {
                    await handleIneligibleMoxieUsers(
                        ineligibleMoxieUsers,
                        callback
                    );
                    return false;
                }
            }

            // Get all wallet addresses including vesting contracts
            const addresses =
                moxieUserInfo.wallets.map((wallet) => wallet?.walletAddress) ||
                [];
            const vestingContractAddresses =
                moxieUserInfo?.vestingContracts?.map(
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
                moxieUserInfo?.id,
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
                portfolio.lockedTvlInUSD = portfolio.lockedTvl * moxieToUSD;
                portfolio.unlockedTvlInUSD = portfolio.unlockedTvl * moxieToUSD;
                portfolio.totalTvlInUSD = portfolio.totalTvl * moxieToUSD;
                portfolio.displayLabel =
                    portfolio.fanTokenMoxieUserId &&
                    portfolio.fanTokenMoxieUserId.length > 0
                        ? `@[${portfolio.fanTokenName}|${portfolio.fanTokenMoxieUserId}]`
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
                moxieUserInfo,
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
