// Import required dependencies and types
import {
    composeContext,
    elizaLogger,
    streamText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    generateObjectDeprecated,
    ModelProviderName,
} from "@moxie-protocol/core";
import { tokenSocialSentimentExamples } from "./examples";
import {
    MoxieUser,
    getTokenDetails,
} from "@moxie-protocol/moxie-agent-lib";
import { formatMessages } from "../../util";
import { twitterScraperService } from "../../services/twitterService";
import { getFarcasterCasts } from "../../services/neynarService";
import { socialPlatformDetectionTemplate, tokenSocialSentimentTemplateV2 } from "./template";

// Export the action configuration
export default {
    name: "TOKEN_SOCIAL_SENTIMENT",
    similes: [
        "SOCIAL_SENTIMENT",
        "TWITTER_TOKEN",
        "TWITTER_TOKEN_SENTIMENT",
        "TWITTER_TWEETS_SENTIMENT",
        "TWITTER_TOKEN_SOCIAL_SENTIMENT",
        "RECENT_TWEETS_INFO",
        "RECENT_TWEETS_SENTIMENT",
        "RECENT_TWEETS_SENTIMENT_SUMMARY",
        "TOKEN_TWEETS",
        "TOKEN_TWEETS_INFO",
        "TOKEN_TWEETS_SENTIMENT",
        "CRYPTO_TWITTER_SENTIMENT",
        "CASHTAG_SENTIMENT",
        "$TICKER_SENTIMENT",
        "SOCIAL_SENTIMENT_TWITTER",
        "SOCIAL_SENTIMENT_FARCASTER",
    ],
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[TokenSocialSentiment] Validating request");
        return true;
    },
    description:
        "Analyzes ERC20 token on Base sentiment on Social Platforms (X and Farcaster). Use this when the user is asking about what people are talking about the token. Input can be token symbol (e.g.$[MOXIE|address]), contract address or token name. but only for X and Farcaster",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[TokenSocialSentiment] Starting SocialSentiment fetch");

        try {
            const traceId = message.id;;
            await twitterScraperService.initialize();
            elizaLogger.log(`[TokenSocialSentiment] message context text: ${message.content.text}`);

            // Initialize or update state
            state = (await runtime.composeState(message, {
                latestMessage: message.content.text,
            })) as State;

            const socialPlatformDetectionContext = composeContext({
                state,
                template: socialPlatformDetectionTemplate,
            });

            const socialPlatformDetectionResponse = await generateObjectDeprecated({
                runtime,
                context: socialPlatformDetectionContext,
                modelClass: ModelClass.SMALL,
            });

            const { socialPlatform, tokenSymbol } = socialPlatformDetectionResponse;
            elizaLogger.log(traceId, `[SocialPlatform] social platform: ${socialPlatform} token symbol: ${tokenSymbol}`);

            const moxieUserId = (state.moxieUserInfo as MoxieUser)?.id;
            const tokenAddress = message.content.text.match(/0x[a-fA-F0-9]{40}/g) || [];
            let tokenTicker: string | RegExpMatchArray | [] = message.content.text.match(/(?<=\$\[)[^|]+(?=\|)/) || [];

            // $[MOXIE|0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527] extract MOXIE and token address
            elizaLogger.log(`[TokenSocialSentiment]token symbol: ${tokenSymbol}`);
            elizaLogger.log(`[TokenSocialSentiment]token ticker: ${tokenTicker}`);
            elizaLogger.log(`[TokenSocialSentiment]token address: ${tokenAddress}`);

            if (tokenSymbol && (!tokenTicker || (Array.isArray(tokenTicker) && tokenTicker.length === 0))) {
                tokenTicker = tokenSymbol;
            }
            if (!tokenTicker || (Array.isArray(tokenTicker) && tokenTicker.length === 0)) {
                elizaLogger.log("[TokenSocialSentiment]didn't find token symbol");
                if (tokenAddress.length > 0) {
                    // Get the token details
                    elizaLogger.log(traceId, "[TokenSocialSentiment]Fetching token details");
                    const tokenDetails = await getTokenDetails([tokenAddress[0]]);

                    if (!tokenDetails) {
                        callback({
                            text: "Please provide a valid token address or ticker symbol",
                            action: "TOKEN_SOCIAL_SENTIMENT",
                        });
                        return false;
                    }
                    tokenTicker = tokenDetails[0].tokenSymbol;
                }
            }

            const formattedSymbol = (Array.isArray(tokenTicker) ? tokenTicker[0] : tokenTicker).toString().toLowerCase();

            let farcasterCasts: any[] = [];
            let tweets: any[] = [];
            // Get the farcaster casts and twitter posts
            if (socialPlatform.includes("farcaster")) {
                farcasterCasts = await getFarcasterCasts(formattedSymbol, runtime, traceId);
                elizaLogger.log(traceId, `[TokenSocialSentiment]farcaster casts: ${JSON.stringify(farcasterCasts)}`);
            }
            if (socialPlatform.includes("twitter")) {
                tweets = await twitterScraperService.getTweetsBySearchQuery(formattedSymbol, 100, traceId);
                elizaLogger.log(traceId, `[Twitter] tweets: ${JSON.stringify(tweets)}`);
            }

            // Generate stream text with the prompt
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
                farcasterCasts: JSON.stringify(farcasterCasts),
                tweets: JSON.stringify(tweets),
                currentDate: new Date().toISOString(),
            })) as State;

            const previousQuestionContext = composeContext({
                state,
                template: tokenSocialSentimentTemplateV2,
            });

            const response = await streamText({
                runtime,
                context: previousQuestionContext,
                modelClass: ModelClass.MEDIUM,
                modelConfigOptions: {
                    modelProvider: ModelProviderName.OPENAI,
                    temperature: 0.5,
                    apiKey: process.env.OPENAI_API_KEY!,
                    modelClass: ModelClass.MEDIUM
                }
            });

            for await (const textPart of response) {
                callback({ text: textPart, action: "TOKEN_SOCIAL_SENTIMENT" });
            }

            return true;
        } catch (error) {
            elizaLogger.error("[TokenSocialSentiment] Error fetching token social sentiment:", error, error?.stack);

            if (callback) {
                await callback({
                    text: "There is some problem while fetching the token social sentiment. Please try again later.",
                    content: { error: error.message },
                    action: "TOKEN_SOCIAL_SENTIMENT_ERROR",
                });
            }
            return false;
        }
    },
    examples: [],
    template: tokenSocialSentimentTemplateV2,
} as Action;
