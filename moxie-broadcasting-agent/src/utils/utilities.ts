import {
    AgentRuntime,
    Character,
    elizaLogger,
    Content,
    ModelClass,
    generateMessageResponse,
} from "@elizaos/core";
import cron from "node-cron";
import { MoxieDataProvider } from "../utils/moxieDataUtil";
import { creatorCoinBuyBurnPrompt, creatorCoinPrompt, creatorCoinWhaleBuySellPrompt } from "../prompts/broadcastPrompts";
import {
    CREATOR_COIN_BB_SUMMARY_CRON_SCHEDULE,
    CREATOR_COIN_SUMMARY_CRON_SCHEDULE,
    WHALE_PURCHASES_SUMMARY_CRON_SCHEDULE,
    CREATOR_COING_MARKET_CAP_CHANGE_CRITERIA,
    CREATOR_COIN_MARKET_CAP_USD,
    CREATOR_COIN_BURN_CRITERIA_USD,
    CREATOR_COIN_BURN_MARKET_CAP_USD,
    CREATOR_COIN_BURN_LIMIT,
    CREATOR_COIN_BURN_LAST_X_MINUTES,
    CREATOR_COIN_NUMBER,
    WHALE_PURCHASE_CRITERIA_USD,
    WHALE_PURCHASE_MARKET_CAP_USD,
    WHALE_PURCHASE_LIMIT,
    WHALE_PURCHASE_LAST_X_MINUTES,
    ENABLE_TWEETS,
} from "../config/dotenvConfig";
import { twitterUtils } from "../utils/twitterUtil";
import { Tweet as TweetEx } from "../types/tweet";


async function sendTweet(tweets: string[], singleThread: boolean = false, previousTweetId: string | null = null): Promise<String | null> {
    if (!tweets || tweets.length === 0 || ENABLE_TWEETS !== "true") {
        elizaLogger.error("No tweets to send");
        return;
    }

    try {
        const isTwitterInitialized = await twitterUtils.initialize();
        if (isTwitterInitialized === false) {
            elizaLogger.error("Failed to initialize Twitter");
            throw new Error("Failed to initialize Twitter");
        }
        elizaLogger.info(`Sending ${tweets.length} tweets...`);

        for (const tweet of tweets) {
            if (!tweet) {
                elizaLogger.warn("Skipping empty tweet");
                continue;
            }

            let response: TweetEx | null = null;
            try {
                if (singleThread && previousTweetId) {
                    response = await twitterUtils.createTweet(tweet, previousTweetId);
                } else {
                    response = await twitterUtils.createTweet(tweet);
                }

                if (response?.id) {
                    previousTweetId = response.id;
                    elizaLogger.info(`Tweet sent successfully: ${tweet.substring(0, 50)}...`);
                }
            } catch (tweetError) {
                elizaLogger.error(`Failed to send individual tweet: ${tweet.substring(0, 50)}...`, tweetError);
            }
        }
        elizaLogger.success("Tweet sequence completed");
        return previousTweetId;
    } catch (error) {
        elizaLogger.error(`Failed to initialize Twitter or send tweets: ${error}`);
        throw error;
    }
}

// Function for broadcasting creatorCoins summary every 4 hours
async function generateCreatorCoinsSummary(character: Character, runtime: AgentRuntime, ignoredCreatorCoinSymbols: string[], isANewTweet: boolean = true): Promise<Content> {
    try {
        const moxieDataProvider = MoxieDataProvider.getInstance();
        const creatorCoins = await moxieDataProvider.fetchCreatorCoinsByMarketCap(
            Number(CREATOR_COIN_NUMBER),
            Number(CREATOR_COIN_MARKET_CAP_USD),
            Number(CREATOR_COING_MARKET_CAP_CHANGE_CRITERIA)
        );

        console.log(JSON.stringify(creatorCoins, null, 2));

        if (!creatorCoins || creatorCoins.length === 0) {
            elizaLogger.info("No creator coins found, no summary to generate");
            return;
        }

        const summary = await generateMessageResponse({
            runtime,
            context: creatorCoinPrompt(creatorCoins, ignoredCreatorCoinSymbols, true),
            modelClass: ModelClass.LARGE,
        });

        return summary;

    } catch (error) {
        elizaLogger.error("Error generating/posting creator coins summary:", error);
    }
}

// Function for broadcasting creatorCoinsBuyBurnDetails every 4 hours but on a different schedule then creatorCoins summary
async function generateCreatorCoinsBuyBurnSummary(character: Character, runtime: AgentRuntime, ignoredCreatorCoinSymbols: string[], isANewTweet: boolean = true): Promise<Content> {
    try {
        const moxieDataProvider = MoxieDataProvider.getInstance();
        const creatorCoinsBuyBurnDetails = await moxieDataProvider.fetchCreatorCoinsBuyBurnDetails(
            Number(CREATOR_COIN_BURN_LAST_X_MINUTES),
            Number(CREATOR_COIN_BURN_LIMIT),
            Number(CREATOR_COIN_BURN_MARKET_CAP_USD),
            Number(CREATOR_COIN_BURN_CRITERIA_USD),
        );

        if (!creatorCoinsBuyBurnDetails || creatorCoinsBuyBurnDetails.length === 0) {
            elizaLogger.error("No creator coins buy-burn details found.");
            return;
        }

        const summary = await generateMessageResponse({
            runtime,
            context: creatorCoinBuyBurnPrompt(creatorCoinsBuyBurnDetails, Number(CREATOR_COIN_BURN_LAST_X_MINUTES), ignoredCreatorCoinSymbols, true),
            modelClass: ModelClass.LARGE,
        });

        elizaLogger.success(JSON.stringify(summary, null, 2));
        return summary;

    } catch (error) {
        elizaLogger.error("Error generating/posting creator coins buy-burn summary:", error);
    }
}

// Function for broadcasting whaleBuyBurnDetails every 5 minutes
async function generateWhaleBuyBurnSummary(character: Character, runtime: AgentRuntime): Promise<Content> {
    try {
        const moxieDataProvider = MoxieDataProvider.getInstance();
        const whaleBuyBurnDetails = await moxieDataProvider.fetchWhaleBuySellTransactions(
            Number(WHALE_PURCHASE_LAST_X_MINUTES),
            Number(WHALE_PURCHASE_LIMIT),
            Number(WHALE_PURCHASE_MARKET_CAP_USD),
            Number(WHALE_PURCHASE_CRITERIA_USD),
        );

        if (!whaleBuyBurnDetails || whaleBuyBurnDetails.length === 0) {
            elizaLogger.error("No whale buy-burn details found.");
            return;
        }

        console.log(JSON.stringify(whaleBuyBurnDetails, null, 2));

        const summary = await generateMessageResponse({
            runtime,
            context: creatorCoinWhaleBuySellPrompt(whaleBuyBurnDetails, Number(WHALE_PURCHASE_LAST_X_MINUTES)),
            modelClass: ModelClass.LARGE,
        });

        return summary;

    } catch (error) {
        elizaLogger.error("Error generating/posting whale buy-burn summary:", error);
    }
}

// Schedule tasks at the required intervals
export async function scheduleCrons(character: Character, runtime: AgentRuntime) {

    // Flag to track if a task is running
    const taskStatus = {
        creatorCoinSummary: false,
        creatorCoinBB: false,
        whalePurchases: false,
        moxieTokenBurn: false,
    };

    cron.schedule(`${CREATOR_COIN_SUMMARY_CRON_SCHEDULE}`, async () => {
        if (taskStatus.creatorCoinSummary) {
            elizaLogger.info("Skipping CreatorCoins summary task as the previous run is still in progress.");
            return;
        }

        taskStatus.creatorCoinSummary = true;

        try {
            elizaLogger.info("Running CreatorCoins summary task...");

            // Fetch cached data using today's date as key
            const todayDate = new Date().toISOString().split('T')[0];
            const cacheKey = `creatorCoinSummary_${todayDate}`;
            const cachedData = await runtime.cacheManager.get<CachedData>(cacheKey);

            let ignoredCreatorCoinSymbols: string[] = [];
            let previousTweetId: string | null = null;

            interface CachedData {
                tweetId: string | null;
                ignoredCreatorCoinSymbols: string[];
            }

            if (cachedData) {
                elizaLogger.info("Cached data found, using previous tweetId and symbols.");
                ignoredCreatorCoinSymbols = cachedData.ignoredCreatorCoinSymbols || [];
                previousTweetId = cachedData.tweetId || null;
            }

            let isANewTweet = true;
            if (previousTweetId) {
                isANewTweet = false;
            }

            const content = await generateCreatorCoinsSummary(character, runtime, ignoredCreatorCoinSymbols, isANewTweet);

            elizaLogger.success(JSON.stringify(content, null, 2));

            if (content?.tweets && Array.isArray(content.tweets)) {
                const newSymbols = content.creatorCoinSymbolsConsidered as string[];
                const updatedSymbols = Array.from(new Set([...ignoredCreatorCoinSymbols, ...newSymbols]));
                elizaLogger.success("Merged symbols (deduplicated):", updatedSymbols);

                const tweetId = await sendTweet(content.tweets, true, previousTweetId);

                if (tweetId) {
                    await runtime.cacheManager.set(cacheKey, {
                        tweetId,
                        ignoredCreatorCoinSymbols: updatedSymbols,
                    },
                    {
                        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                    });

                    elizaLogger.success("Cache updated successfully with new symbols and tweetId.");
                }
            } else {
                elizaLogger.info("No tweets to send.");
            }
        } catch (error) {
            elizaLogger.error("Error in CreatorCoins summary task:", error);
        } finally {
            taskStatus.creatorCoinSummary = false;
        }
    });
    elizaLogger.success(`............... [ CreatorCoins summary task scheduled - ${CREATOR_COIN_SUMMARY_CRON_SCHEDULE}] ...............`);

    cron.schedule(`${CREATOR_COIN_BB_SUMMARY_CRON_SCHEDULE}`, async () => {
        if (taskStatus.creatorCoinBB) {
            elizaLogger.info("Skipping CreatorCoins buy-burn summary task as the previous run is still in progress.");
            return;
        }

        taskStatus.creatorCoinBB = true;
        try {
            elizaLogger.info("Running CreatorCoins buy-burn summary task...");

            // Fetch cached data using today's date as key
            const todayDate = new Date().toISOString().split('T')[0];
            const cacheKey = `creatorCoinBB_${todayDate}`;
            const cachedData = await runtime.cacheManager.get<CachedData>(cacheKey);

            let ignoredCreatorCoinSymbols: string[] = [];
            let previousTweetId: string | null = null;

            interface CachedData {
                tweetId: string | null;
                ignoredCreatorCoinSymbols: string[];
            }

            if (cachedData) {
                elizaLogger.info("Cached data found, using previous tweetId and symbols.");
                ignoredCreatorCoinSymbols = cachedData.ignoredCreatorCoinSymbols || [];
                previousTweetId = cachedData.tweetId || null;
            }

            let isANewTweet = true;
            if (previousTweetId) {
                isANewTweet = false;
            }

            const content = await generateCreatorCoinsBuyBurnSummary(character, runtime, ignoredCreatorCoinSymbols, isANewTweet);

            if (content?.tweets && Array.isArray(content.tweets)) {
                const newSymbols = content.creatorCoinSymbolsConsidered as string[];
                const updatedSymbols = Array.from(new Set([...ignoredCreatorCoinSymbols, ...newSymbols]));
                elizaLogger.success("Merged symbols (deduplicated):", updatedSymbols);

                const tweetId = await sendTweet(content.tweets, true, previousTweetId);

                if (tweetId) {
                    await runtime.cacheManager.set(cacheKey, {
                        tweetId,
                        ignoredCreatorCoinSymbols: updatedSymbols,
                    },
                    {
                        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                    }
                );

                    elizaLogger.success("Cache updated successfully with new symbols and tweetId.");
                }
            } else {
                elizaLogger.info("No tweets to send.");
            }
        } catch (error) {
            elizaLogger.error("Error in CreatorCoins buy-burn summary task:", error);
        } finally {
            taskStatus.creatorCoinBB = false;
        }
    });
    elizaLogger.success(`............... [ CreatorCoins buy-burn summary task scheduled - ${CREATOR_COIN_BB_SUMMARY_CRON_SCHEDULE}] ...............`);

    cron.schedule(`${WHALE_PURCHASES_SUMMARY_CRON_SCHEDULE}`, async () => {
        if (taskStatus.whalePurchases) {
            elizaLogger.info("Skipping Whale purchases summary task as the previous run is still in progress.");
            return;
        }

        taskStatus.whalePurchases = true;
        try {
            elizaLogger.info("Running Whale purchases summary task...");
            const content = await generateWhaleBuyBurnSummary(character, runtime);

            elizaLogger.success(JSON.stringify(content, null, 2));

            if (content?.tweets && Array.isArray(content.tweets)) {
                await sendTweet(content.tweets, false);
            } else {
                elizaLogger.log("No tweets to send");
            }
        } catch (error) {
            elizaLogger.error("Error in Whale purchases summary task:", error);
        } finally {
            taskStatus.whalePurchases = false;
        }
    });
    elizaLogger.success(`............... [ Whale purchases summary task scheduled - ${WHALE_PURCHASES_SUMMARY_CRON_SCHEDULE}] ...............`);
}