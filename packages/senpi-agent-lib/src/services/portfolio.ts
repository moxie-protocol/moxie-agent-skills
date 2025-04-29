import { elizaLogger, IAgentConfig } from "@senpi-ai/core";

export interface SenpiPortfolio {
    currentPrice: number;
    fanTokenName: string;
    fanTokenSymbol: string;
    lockedTvl: number;
    protocolTokenInvested: number;
    tokenLockedTvl: number;
    tokenUnlockedTvl: number;
    totalLockedAmount: number;
    totalUnlockedAmount: number;
    walletAddresses: string[];
    unlockedTvl: number;
    fanTokenAddress: string;
    totalTvl: number;
    fanTokenSenpiUserId: string;
}

interface SenpiPortfolioResponse {
    data: {
        MoxieUserPortfolios: {
            MoxieUserPortfolio: SenpiPortfolio[];
        };
    };
}

const AIRSTACK_GRAPHQL_ENDPOINT = process.env.AIRSTACK_GRAPHQL_ENDPOINT;

export async function fetchPortfolioBySenpiIdOrderByTVL(
    senpiId: string,
    limit: number = 10
): Promise<SenpiPortfolio[]> {
    try {
        elizaLogger.info(`Fetching portfolio for senpiId: ${senpiId}`);
        const response = await fetch(AIRSTACK_GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                // 'Authorization': process.env.AIRSTACK_API_KEY!,
            },
            body: JSON.stringify({
                query: `
          query GetPortfolio($usdcUserId: String!) {
            MoxieUserPortfolios(input: {filter: {senpiUserId: { _eq: $usdcUserId }}, order: {totalTvl: DESC}, limit: ${limit}}) {
              MoxieUserPortfolio {
                currentPrice
                fanTokenName
                fanTokenSymbol
                lockedTvl
                protocolTokenInvested
                tokenLockedTvl
                tokenUnlockedTvl
                totalLockedAmount
                totalUnlockedAmount
                walletAddresses
                unlockedTvl
                fanTokenAddress
                totalTvl
                fanTokenSenpiUserId
              }
            }
          }
        `,
                variables: {
                    senpiUserId: senpiId,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as SenpiPortfolioResponse;
        return data.data.MoxieUserPortfolios.MoxieUserPortfolio;
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        return [];
    }
}
