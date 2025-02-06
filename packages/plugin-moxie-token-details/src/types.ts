export interface LiquidityPool {
    poolName?: string;
    poolAddress: string;
    liquidityUSD: number;
}
export interface TokenDetails {
    tokenName?: string;
    tokenSymbol?: string;
    tokenAddress?: string;
    networkId?: number;
    priceUSD?: string;
    liquidityTop3PoolsUSD?: string;
    marketCapUSD?: string;
    uniqueHolders?: number;
    uniqueBuysLast1Hour?: number;
    uniqueBuysLast4Hours?: number;
    uniqueBuysLast12Hours?: number;
    uniqueBuysLast24Hours?: number;
    uniqueSellsLast1Hour?: number;
    uniqueSellsLast4Hours?: number;
    uniqueSellsLast12Hours?: number;
    uniqueSellsLast24Hours?: number;
    changePercent1Hour?: string;
    changePercent4Hours?: string;
    changePercent12Hours?: string;
    changePercent24Hours?: string;
    high1Hour?: string;
    high4Hours?: string;
    high12Hours?: string;
    high24Hours?: string;
    low1Hour?: string;
    low4Hours?: string;
    low12Hours?: string;
    low24Hours?: string;
    volumeChange1Hour?: string;
    volumeChange4Hours?: string;
    volumeChange12Hours?: string;
    volumeChange24Hours?: string;
    liquidityPools?: LiquidityPool[];
}