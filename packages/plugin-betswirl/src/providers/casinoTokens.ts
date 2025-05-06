import { ethers } from "ethers";
import {
    elizaLogger,
    Provider,
    IAgentRuntime,
    Memory,
    State,
} from "@senpi-ai/core";
import {
    CasinoChainId,
    type Token,
    type RawCasinoToken,
    getCasinoTokensFunctionData,
    rawTokenToToken,
} from "@betswirl/sdk-core";

const CACHE_KEY = "betswirl:tokens";
const CACHE_TTL = 15 * 60; // 15 minutes

function formatTokensContext(tokens: Token[]): string {
    return `Available casino tokens:
${tokens
    .map((token) => `- ${token.address} - symbol: ${token.symbol}`)
    .join("\n")}

Total available tokens: ${tokens.length}

You can use these token symbols when betting or retrieving bets.`;
}

export const casinoTokensProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string> => {
        try {
            // Try to get from cache first
            let tokens = await runtime.cacheManager.get<Token[]>(CACHE_KEY);

            // Fetch if no cache
            if (!tokens) {
                tokens = await getCasinoTokens();

                // Cache the result
                await runtime.cacheManager.set(CACHE_KEY, tokens, {
                    expires: CACHE_TTL,
                });
            }

            return formatTokensContext(tokens);
        } catch (error) {
            elizaLogger.error("Casino tokens provider error:", error.message);
            return (
                "Casino tokens list is temporarily unavailable. Please try again later. " +
                error.message
            );
        }
    },
};

export async function getCasinoTokens(): Promise<Token[]> {
    const chainId = 8453 as CasinoChainId;
    const casinoTokensFunctionData = getCasinoTokensFunctionData(chainId);
    const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
    const casinoTokensContract = new ethers.Contract(
        casinoTokensFunctionData.data.to,
        casinoTokensFunctionData.data.abi,
        provider
    );
    const rawCasinoTokens: RawCasinoToken[] =
        await casinoTokensContract[
            casinoTokensFunctionData.data.functionName
        ]();

    return rawCasinoTokens
        .filter((rawToken) => rawToken.token.allowed && !rawToken.token.paused)
        .map((rawToken) => ({
            ...rawTokenToToken(rawToken, chainId),
            decimals: Number(rawToken.decimals),
        }));
}
