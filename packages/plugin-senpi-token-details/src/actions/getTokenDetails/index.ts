import {
    composeContext,
    elizaLogger,
    streamText,
    HandlerCallback,
    IAgentRuntime,
    ModelClass,
    Memory,
    State,
    type Action,
} from "@senpi-ai/core";
import { tokenDetailsExamples } from "./examples";
import { getTokenDetails } from "@senpi-ai/senpi-agent-lib";
import { tokenDetailsSummary } from "./template";
import { getSenpiCache, setSenpiUserIdCache } from "../../util";
import { TOP_MEMORY_CONVERSATIONS, BASE_NETWORK_ID } from "../../config";

export default {
    name: "TOKEN_DETAILS",
    similes: [
        "TOKEN_DETAILS_SUMMARY",
        "BASE_TOKEN_DETAIL",
        "BASE_TOKEN_DETAILS",
        "BASE_TOKEN_DETAILS_SUMMARY",
        "TOKEN_SUMMARY",
        "ERC20_DETAILS",
        "ERC20_DETAILS_SUMMARY",
        "ERC20_TOKEN_DETAILS",
        "ERC20_TOKEN_DETAILS_SUMMARY",
        "TOKEN_INFO",
        "TOKEN_PORTFOLIO",
        "TOKEN_PRICE",
        "TOKEN_MARKET_CAP",
        "TOKEN_HOLDINGS",
        "TOKEN_LIQUIDITY",
        "TOKEN_MARKET_PERFORMANCE",
        "TOKEN_MARKET_SENTIMENT",
    ],
    suppressInitialMessage: true,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[TOKEN_DETAILS] Validating request");
        const codexApiKey = process.env.CODEX_API_KEY;
        if (!codexApiKey) {
            elizaLogger.error("[TOKEN_DETAILS] CODEX_API_KEY is not set");
            return false;
        }
        return true;
    },
    description:
        "Fetches detailed insights on ERC20 tokens (excluding creator coins), including price, market cap, liquidity, trading activity, and volume fluctuations.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[TOKEN_DETAILS] Starting portfolio fetch");

        const memoryObj = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: TOP_MEMORY_CONVERSATIONS,
            unique: true,
        });

        const formattedHistory = memoryObj.map((memory) => {
            const role =
                memory.userId === runtime.agentId ? "Assistant" : "User";
            return `${role}: ${memory.content.text}`;
        });
        const memoryContents = formattedHistory.reverse().slice(-12);

        elizaLogger.success(
            `Memory contents: ${JSON.stringify(memoryContents)}`
        );

        // Extract Ethereum/Base addresses from message
        const addresses =
            message.content.text.match(/0x[a-fA-F0-9]{40}/g) || [];

        if (addresses.length === 0 && memoryContents.length <= 1) {
            await callback({
                text: "Please provide the base address of the token you want to know more about",
            });
            return false;
        }

        // Convert addresses to lowercase and append chain ID
        const formattedAddresses = addresses.map(
            (addr) => `${addr.toLowerCase()}:${BASE_NETWORK_ID}`
        );

        elizaLogger.log("[TOKEN_DETAILS] Checking cache for token details");

        let tokenDetails: string[] = [];
        let tokenDetailsToFetch = [];
        let cachedTokenDetails = [];

        // Check cache for each address individually
        for (const address of formattedAddresses) {
            const cachedDetail = await getSenpiCache(address, runtime);

            if (cachedDetail) {
                elizaLogger.log(
                    `[TOKEN_DETAILS] Using cached details for ${address}`
                );
                cachedTokenDetails.push(JSON.parse(cachedDetail as string));
            } else {
                elizaLogger.log(
                    `[TOKEN_DETAILS] Will fetch details for ${address}`
                );
                tokenDetailsToFetch.push(address);
            }
        }

        // Only fetch details for addresses not in cache
        if (tokenDetailsToFetch.length > 0) {
            elizaLogger.log("[TOKEN_DETAILS] Fetching fresh token details");
            const freshTokenDetails =
                await getTokenDetails(tokenDetailsToFetch);

            // Cache the new details individually
            for (let i = 0; i < tokenDetailsToFetch.length; i++) {
                const address = `${tokenDetailsToFetch[i].toLowerCase()}:8453`;
                const addressCacheKey = `TOKEN_DETAILS-${address}`;
                await setSenpiUserIdCache(
                    JSON.stringify(freshTokenDetails[i]),
                    addressCacheKey,
                    runtime
                );
            }

            tokenDetails = [...cachedTokenDetails, ...freshTokenDetails];
        } else {
            tokenDetails = cachedTokenDetails;
        }

        if (
            (!tokenDetails || tokenDetails.length === 0) &&
            memoryContents.length <= 1
        ) {
            await callback({
                text: "I couldn't find any token details for the provided addresses",
                action: "TOKEN_DETAILS_ERROR",
            });
            return false;
        }

        elizaLogger.success(
            "[TOKEN_DETAILS] Successfully fetched token details"
        );

        const newstate = await runtime.composeState(message, {
            tokenDetails: JSON.stringify(tokenDetails),
            question: message.content.text,
            memory: memoryContents.length > 1 ? memoryContents : "",
        });

        const context = composeContext({
            state: newstate,
            template: tokenDetailsSummary,
        });

        const summary = streamText({
            runtime,
            context,
            modelClass: ModelClass.MEDIUM,
        });

        for await (const textPart of summary) {
            callback({ text: textPart, action: "TOKEN_DETAILS" });
        }

        elizaLogger.success(
            "[TOKEN_DETAILS] Successfully generated token details summary"
        );

        return true;
    },
    examples: tokenDetailsExamples,
    template: tokenDetailsSummary,
} as Action;
