import { Scraper,  } from "agent-twitter-client";
import { elizaLogger } from "@elizaos/core";
import { MAX_TWEET_LENGTH } from "../config/constants";
import { Tweet as TweetExt } from "../types/tweet";

class TwitterUtils {
    private scraper: Scraper;
    private isInitialized: boolean = false;
    private cookies: string | null = null;

    constructor() {
        this.scraper = new Scraper();
        this.isInitialized = false;
    }

    public async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

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

        this.isInitialized = true;
        return this.isInitialized
    }

    public async createTweet(
        text: string,
        replyToTweetId?: string
    ): Promise<TweetExt | null> {
        try {
            const truncatedText =
                text.length > MAX_TWEET_LENGTH ? text.slice(0, MAX_TWEET_LENGTH) : text;
            const resp = await this.scraper.sendTweet(truncatedText, replyToTweetId);
            if (resp.status !== 200) {
                elizaLogger.error(`Failed to send tweet: ${resp.statusText}`);
                throw new Error(`Failed to send tweet: ${resp.statusText}`);
            }

            const body = await resp.json();

            if (body?.data?.create_tweet?.tweet_results?.result) {
                const tweetResult = body.data.create_tweet.tweet_results.result;
                const finalTweet: TweetExt = {
                  id: tweetResult.rest_id,
                  text: tweetResult.legacy.full_text,
                  conversationId: tweetResult.legacy.conversation_id_str,
                  timestamp: new Date(tweetResult.legacy.created_at).getTime() / 1000,
                  userId: tweetResult.legacy.user_id_str,
                  inReplyToStatusId: tweetResult.legacy.in_reply_to_status_id_str,
                  hashtags: [],
                  mentions: [],
                  photos: [],
                  thread: [],
                  urls: [],
                  videos: [],
                };
                return finalTweet;
              } else {
                elizaLogger.info(`Tweet response: ${JSON.stringify(body)}`);
              }
              return null;
        } catch (error) {
            elizaLogger.error(`Failed to send tweet: ${error}`);
            throw error;
        }
    }
}

export const twitterUtils = new TwitterUtils();
