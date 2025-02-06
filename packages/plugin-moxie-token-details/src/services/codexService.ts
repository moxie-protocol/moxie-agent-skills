import { Codex } from "@codex-data/sdk";
import { TokenDetails, LiquidityPool } from "../types"
import { isValidBaseAddress } from "../util";
import { elizaLogger } from "@elizaos/core";

const codexApiKey = process.env.CODEX_API_KEY;

// Constants
const BASE_NETWORK_ID = 8453;
const MIN_LIQUIDITY = 50;
const TOP_PAIRS_LIMIT = 3;
const PAIRS_QUERY_LIMIT = 500;


async function listPairsWithMetadataForToken(client: Codex, tokenAddress: string, priceUSD: number): Promise<{ pairs: LiquidityPool[], totalLiquiditySum: number }> {
    if (!isValidBaseAddress(tokenAddress)) {
        throw new Error(`Invalid Base address: ${tokenAddress}`);
    }

    try {
        const pairs = await client.queries.listPairsWithMetadataForToken({
            tokenAddress,
            networkId: BASE_NETWORK_ID,
            limit: PAIRS_QUERY_LIMIT,
        });

        if (!pairs?.listPairsWithMetadataForToken?.results) {
            return { pairs: [], totalLiquiditySum: 0 };
        }

        const filteredPairs = pairs.listPairsWithMetadataForToken.results
            .filter(pair => {
                const pairAddress = pair.pair?.address;
                const liquidity = Number(pair.liquidity || 0);
                return pairAddress &&
                    isValidBaseAddress(pairAddress) && liquidity > MIN_LIQUIDITY;
            })
            .map(pair => {
                const isToken0 = pair.pair?.token0?.toLowerCase() === tokenAddress.toLowerCase();
                const pooledAmount = isToken0 ?
                    pair.pair?.pooled?.token0 :
                    pair.pair?.pooled?.token1;

                const tokenAmount = Number((Number(pooledAmount || 0) * priceUSD).toFixed(2));

                // Find the exchange info for this pool
                const exchange = pair.pair?.token0Data?.exchanges?.find(
                    ex => ex.address === pair.pair?.exchangeHash
                ) || pair.pair?.token1Data?.exchanges?.find(
                    ex => ex.address === pair.pair?.exchangeHash
                );

                return {
                    poolName: exchange?.name,
                    poolAddress: pair.pair!.address,
                    liquidityUSD: Number(pair.liquidity || 0) + tokenAmount,
                };
            })
            .sort((a, b) => b.liquidityUSD - a.liquidityUSD)
            .slice(0, TOP_PAIRS_LIMIT);

        const totalLiquiditySum = filteredPairs.reduce((sum, item) => sum + item.liquidityUSD, 0);

        return { pairs: filteredPairs, totalLiquiditySum };
    } catch (error) {
        elizaLogger.error(`Error fetching pairs for token ${tokenAddress}: ${error}`);
        throw error;
    }
}

export async function getTokenDetailsFromCodex(tokenAddresses: string[]): Promise<TokenDetails[]> {
    if (!codexApiKey) {
        throw new Error("CODEX_API_KEY is not set");
    }
    const client = new Codex(codexApiKey);

    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
        throw new Error("At least one token address is required");
    }

    try {
        const tokenDetails = await client.queries.filterTokens({
            tokens: tokenAddresses,
        });

        if (!tokenDetails.filterTokens?.results) {
            return [];
        }

        const tokens = await Promise.all(
            tokenDetails.filterTokens.results.map(async (token) => {
                if (!token?.token?.info?.address) {
                    throw new Error("Token address missing in response");
                }

                const details: TokenDetails = {
                    tokenName: token?.token?.name ?? undefined,
                    tokenSymbol: token?.token?.symbol ?? undefined,
                    tokenAddress: token?.token?.info?.address ?? undefined,
                    networkId: token?.token?.networkId ?? undefined,
                    priceUSD: token?.priceUSD ?? undefined,
                    marketCapUSD: token?.marketCap ?? undefined,
                    uniqueHolders: token?.holders ?? undefined,
                    uniqueBuysLast1Hour: token?.uniqueBuys1 ?? undefined,
                    uniqueBuysLast4Hours: token?.uniqueBuys4 ?? undefined,
                    uniqueBuysLast12Hours: token?.uniqueBuys12 ?? undefined,
                    uniqueBuysLast24Hours: token?.uniqueBuys24 ?? undefined,
                    uniqueSellsLast1Hour: token?.uniqueSells1 ?? undefined,
                    uniqueSellsLast4Hours: token?.uniqueSells4 ?? undefined,
                    uniqueSellsLast12Hours: token?.uniqueSells12 ?? undefined,
                    uniqueSellsLast24Hours: token?.uniqueSells24 ?? undefined,
                    changePercent1Hour: token?.change1 ?? undefined,
                    changePercent4Hours: token?.change4 ?? undefined,
                    changePercent12Hours: token?.change12 ?? undefined,
                    changePercent24Hours: token?.change24 ?? undefined,
                    high1Hour: token?.high1 ?? undefined,
                    high4Hours: token?.high4 ?? undefined,
                    high12Hours: token?.high12 ?? undefined,
                    high24Hours: token?.high24 ?? undefined,
                    low1Hour: token?.low1 ?? undefined,
                    low4Hours: token?.low4 ?? undefined,
                    low12Hours: token?.low12 ?? undefined,
                    low24Hours: token?.low24 ?? undefined,
                    volumeChange1Hour: token?.volumeChange1 ?? undefined,
                    volumeChange4Hours: token?.volumeChange4 ?? undefined,
                    volumeChange12Hours: token?.volumeChange12 ?? undefined,
                    volumeChange24Hours: token?.volumeChange24 ?? undefined,
                };

                const { pairs, totalLiquiditySum } = await listPairsWithMetadataForToken(
                    client,
                    token.token.info.address,
                    Number(token?.priceUSD ?? 0)
                );
                details.liquidityTop3PoolsUSD = totalLiquiditySum.toString();
                details.liquidityPools = pairs;
                return details;
            })
        );

        return tokens;
    } catch (error) {
        elizaLogger.error(`Error in getTokenDetailsFromCodex:  ${error}`);
        throw error;
    }
}
