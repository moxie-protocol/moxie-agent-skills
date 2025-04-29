import { elizaLogger } from "@senpi-ai/core";
import { Scraper, SearchMode, Tweet } from "agent-twitter-client";

class TwitterService {
    private scraper: Scraper;
    private isInitialzed;

    constructor() {
        this.scraper = new Scraper();
        this.isInitialzed = false;
    }

    async initialize() {
        if (this.isInitialzed) {
            return true;
        }

        try {
            const cookiesArray = JSON.parse(
                process.env.TWITTER_COOKIES?.replace(/\\"/g, '"') || "[]"
            );

            if (!Array.isArray(cookiesArray)) {
                throw new Error(
                    "TWITTER_COOKIES environment variable must contain a JSON array string"
                );
            }

            // Convert the cookie objects to Cookie instances
            const cookieStrings = cookiesArray?.map(
                (cookie: any) =>
                    `${cookie.key}=${cookie.value}; Domain=${cookie.domain}; Path=${
                        cookie.path
                    }; ${cookie.secure ? "Secure" : ""}; ${
                        cookie.httpOnly ? "HttpOnly" : ""
                    }; SameSite=${cookie.sameSite || "Lax"}`
            );

            await this.scraper.setCookies(cookieStrings);
            const isLoggedIn = await this.scraper.isLoggedIn();

            if (!isLoggedIn) {
                throw new Error("Failed to login to Twitter - invalid cookies");
            }

            this.isInitialzed = true;

            return this.isInitialzed;
        } catch (error) {
            throw new Error(
                `Failed to initialize Twitter service: ${error.message}`
            );
        }
    }

    async getTweetsBySearchQuery(
        query: string,
        maxTweets: number = 20,
        traceId: string
    ): Promise<Tweet[]> {
        const startTime = Date.now();
        const tweets = [];

        try {
            query = "$" + query;
            for await (const tweet of this.scraper.searchTweets(
                query,
                maxTweets
            )) {
                // Check if tweet is within last 48 hours
                const tweetTime = new Date(tweet.timeParsed).getTime();
                const now = Date.now();
                const hoursDiff = (now - tweetTime) / (1000 * 60 * 60);

                if (
                    hoursDiff <=
                    Number(process.env.TWITTER_MAX_HOURS_AGE || "48")
                ) {
                    tweet.html = "";
                    elizaLogger.debug(
                        traceId,
                        `Timestamp ${tweet.id} ${tweet.timeParsed} ${tweet.text}`
                    );
                    tweets.push(tweet);
                }
            }
        } catch (error) {
            elizaLogger.error(
                traceId,
                `Failed to get tweets for query ${query}: ${error.message}`
            );
            return [];
        }

        const endTime = Date.now();
        elizaLogger.debug(
            traceId,
            `Time taken to fetch ${tweets.length} tweets for ${query}: ${endTime - startTime}ms`
        );

        return tweets;
    }
}

export const twitterScraperService = new TwitterService();
