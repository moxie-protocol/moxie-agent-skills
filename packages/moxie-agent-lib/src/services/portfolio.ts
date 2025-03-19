import { elizaLogger, IAgentConfig } from "@moxie-protocol/core";

export interface MoxiePortfolio {
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
  fanTokenMoxieUserId: string;
}

interface MoxiePortfolioResponse {
  data: {
    MoxieUserPortfolios: {
      MoxieUserPortfolio: MoxiePortfolio[];
    }
  }
}

const AIRSTACK_GRAPHQL_ENDPOINT = process.env.AIRSTACK_GRAPHQL_ENDPOINT;

export async function fetchPortfolioByMoxieIdOrderByTVL (moxieId: string, limit: number = 10): Promise<MoxiePortfolio[]> {
  try {
    elizaLogger.info(`Fetching portfolio for moxieId: ${moxieId}`);
    const response = await fetch(AIRSTACK_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': process.env.AIRSTACK_API_KEY!,
      },
      body: JSON.stringify({
        query: `
          query GetPortfolio($moxieUserId: String!) {
            MoxieUserPortfolios(input: {filter: {moxieUserId: { _eq: $moxieUserId }}, order: {totalTvl: DESC}, limit: ${limit}}) {
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
                fanTokenMoxieUserId
              }
            }
          }
        `,
        variables: {
            moxieUserId: moxieId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json() as MoxiePortfolioResponse;
    return data.data.MoxieUserPortfolios.MoxieUserPortfolio;

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    return [];
  }
}
