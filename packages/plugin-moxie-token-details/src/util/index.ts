import { IAgentRuntime } from "@moxie-protocol/core";

const CACHE_EXPIRATION = 60000; // 1 minute in milliseconds

export async function setMoxieUserIdCache(
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

export const isValidBaseAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};
