import { elizaLogger } from "@senpi-ai/core";
import { Scraper, Tweet } from "agent-twitter-client";

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

    // todo clean up twitter response
    // add caching layer
    // put timetamp filter
    async getTweetsByUser(
        handle: string,
        maxTweets: number = 20
    ): Promise<Tweet[]> {
        const startTime = Date.now();
        const tweets = [];
        try {
            for await (const tweet of this.scraper.getTweets(
                handle,
                maxTweets
            )) {
                console.log(`Timestamp ${tweet.id} ${tweet.timeParsed}  `);
                tweets.push(tweet);
            }
        } catch (error) {
            elizaLogger.error(
                `Failed to get tweets for user ${handle}: ${error.message}`
            );
            return [];
        }

        const endTime = Date.now();
        elizaLogger.debug(
            `Time taken to fetch ${tweets.length} tweets for ${handle}: ${endTime - startTime}ms`
        );

        return tweets;
    }
}
export const twitterService = new TwitterService();
