import {
    IAgentRuntime,
    Memory,
    Actor,
    Content,
    formatTimestamp,
    elizaLogger
} from "@moxie-protocol/core";
import { MoxieUser } from "@moxie-protocol/moxie-agent-lib";

const CACHE_EXPIRATION = 120000; // 2 minutes in milliseconds

import { FREEMIUM_TRENDING_CREATORS } from "./config";
import { fetchPluginTokenGate } from "@moxie-protocol/moxie-agent-lib";
import { UUID } from "@moxie-protocol/core";

const FREEMIUM_TRENDING_CREATORS_LIST = FREEMIUM_TRENDING_CREATORS
    ? FREEMIUM_TRENDING_CREATORS.split(",")
    : [];

export async function setMoxieCache(
    data: string,
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<void> {
    await runtime.cacheManager.set(cacheKey, data, {
        expires: Date.now() + CACHE_EXPIRATION,
    });
}

export async function getMoxieCache(
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<string | null> {
    return await runtime.cacheManager.get(cacheKey);
}

export const formatMessages = ({
    agentId,
    messages,
    actors,
}: {
    agentId: UUID;
    messages: Memory[];
    actors: Actor[];
}) => {
    const messageStrings = messages
        .filter(
            (message: Memory) => message.userId && message.userId !== agentId
        )
        .map((message: Memory) => {
            const messageContent = (message.content as Content).text;
            const messageAction = (message.content as Content).action;
            const formattedName =
                actors.find((actor: Actor) => actor.id === message.userId)
                    ?.name || "Unknown User";

            const attachments = (message.content as Content).attachments;

            const timestamp = formatTimestamp(message.createdAt);

            const shortId = message.userId.slice(-5);

            return `(${timestamp}) [${shortId}] ${formattedName}: ${messageContent}${messageAction && messageAction !== "null" ? ` (${messageAction})` : ""}`;
        })
        .join("\n");
    return messageStrings;
};
