import { ethers } from "ethers";
import {
    elizaLogger,
    Provider,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-lib/src/wallet";
import {
    type CasinoChainId,
    getGamePausedFunctionData,
    casinoChainById,
    type CASINO_GAME_TYPE,
} from "@betswirl/sdk-core";

const CACHE_KEY = "betswirl:games";
const CACHE_TTL = 15 * 60; // 5 minutes

function formatGamesContext(games: string[]): string {
    return `Available casino games:
${games.map((game) => `- ${game}`).join("\n")}

Total available games: ${games.length}

You can use these games name when betting or retrieving bets.`;
}

export const casinoGamesProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            // Try to get from cache first
            let games = await runtime.cacheManager.get<string[]>(CACHE_KEY);

            // Fetch if no cache
            if (!games) {
                const wallet = state.agentWallet as MoxieWalletClient;
                const chainId = Number(
                    (await wallet.wallet.provider.getNetwork()).chainId
                ) as CasinoChainId;
                games = await getCasinoGames(chainId, wallet);

                // Cache the result
                await runtime.cacheManager.set(CACHE_KEY, games, {
                    expires: CACHE_TTL,
                });
            }

            return formatGamesContext(games);
        } catch (error) {
            elizaLogger.error("Casino games provider error:", error.message);
            return (
                "Casino games list is temporarily unavailable. Please try again later. " +
                error.message
            );
        }
    },
};

async function getCasinoGames(
    chainId: CasinoChainId,
    wallet: MoxieWalletClient
) {
    const casinoChain = casinoChainById[chainId];
    const games = casinoChain.contracts.games;
    const gamesPausedStatus = await Promise.all(
        Object.keys(games).map(async (game: CASINO_GAME_TYPE) => {
            const gamePausedFunctionData = getGamePausedFunctionData(
                game,
                chainId
            );
            const gameContract = new ethers.Contract(
                gamePausedFunctionData.data.to,
                gamePausedFunctionData.data.abi,
                wallet.wallet.provider
            );
            return {
                name: game,
                paused: (await gameContract[
                    gamePausedFunctionData.data.functionName
                ]()) as boolean,
            };
        })
    );
    return gamesPausedStatus
        .filter((game) => !game.paused)
        .map((game) => game.name);
}
