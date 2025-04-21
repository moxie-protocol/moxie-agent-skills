import {
    Action,
    composeContext,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
    streamText,
    ModelProviderName,
    ModelClass,
    generateObjectDeprecated,
} from "@moxie-protocol/core";
import { postTemplate } from "../templates/postTemplate";
import { sharingExamples } from "./examples";
import { moxieUserService } from "@moxie-protocol/moxie-agent-lib";

export default {
    name: "POST_CONTENT",
    similes: [
        "SHARE_CONTENT",
        "CREATE_POST",
        "SUMMARIZE_AND_SHARE",
        "TWEET_THIS",
        "SHARE_ON_SOCIAL",
        "CREATE_SUMMARY"
    ],
    suppressInitialMessage: true,
    description: "Creates and posts optimized social media content: generates a concise summary from the agent's previous response and shares it as a Farcaster cast and/or Twitter/X tweet. Automatically formats the content to meet platform-specific requirements.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[PostContent] Validating request");
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[PostContent] Starting post content");

        try {
            const previousMessage = state?.recentMessagesData?.slice(-3)

            if (previousMessage.length === 0) {
                callback({ text: "I cannot find the previous conversation. Please try again.", action: "POST_CONTENT_ERROR" });
                return false;
            }
            // Check for recent POST_CONTENT_SUMMARY_SUCCESS action that will contaion the summary text if asked previously
            const hasRecentPostContent = previousMessage
                .slice()
                .reverse()
                .filter(msg => msg?.content?.action === 'POST_CONTENT_SUMMARY_SUCCESS');

            if (hasRecentPostContent.length > 0) {
                const summaryText = hasRecentPostContent[0]?.content?.text;
                    const postResponse = await moxieUserService.publishPost({
                        text: summaryText,
                        platform: "FARCASTER"
                    }, state.authorizationHeader as string);
                    callback({ text: `I have posted the summary on Farcaster. You can check it out here: https://warpcast.com/${postResponse.post.username}/${postResponse.post.hash}`, action: "POST_CONTENT_SUCCESS" });
            } else {
                const stateSummary = (await runtime.composeState(message, {
                    previousMessage: JSON.stringify(previousMessage),
                    latestMessage: JSON.stringify(message.content.text),
                })) as State;

                const stateSummaryContext = composeContext({
                    state: stateSummary,
                    template: postTemplate,
                });

                const summaryStream = await streamText({
                    runtime,
                    context: stateSummaryContext,
                    modelClass: ModelClass.MEDIUM,
                });
                for await (const textPart of summaryStream) {
                    callback({ text: textPart, action: "POST_CONTENT_SUMMARY_SUCCESS", cta: "FARCASTER_CAST" });
                }

            }
            return true;
        } catch (error) {
            elizaLogger.error("[PostContent] Error posting content:", error, error?.stack);
            if (callback) {
                await callback({
                    text: ` There is some problem while posting the content. Please try again later.`,
                    content: { error: error.message },
                    action: "POST_CONTENT_ERROR"
                });
            }
            return false;
        }
    },
    examples: sharingExamples
};