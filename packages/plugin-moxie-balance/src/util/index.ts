import { IAgentRuntime } from "@moxie-protocol/core";

const CACHE_EXPIRATION = 120000; // 2 minutes in milliseconds

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
