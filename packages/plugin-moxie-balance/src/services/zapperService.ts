import axios from 'axios';
import { Portfolio, PortfolioResponse } from '../types';
import { IAgentRuntime } from '@elizaos/core';
import { getMoxieCache, setMoxieCache } from '../util';


const API_KEY = process.env.ZAPPER_API_KEY;
const encodedKey = btoa(API_KEY);

const client = axios.create({
  baseURL: 'https://public.zapper.xyz/graphql',
  headers: {
    'authorization': `Basic ${encodedKey}`,
    'Content-Type': 'application/json'
  }
});

const PortfolioQuery = `
  query providerPorfolioQuery($addresses: [Address!]!, $networks: [Network!]!) {
    portfolio(addresses: $addresses, networks: $networks, appIds:["moxie-protocol"]) {
      tokenBalances {
        address
        network
        token {
          balance
          balanceUSD
          baseToken {
            name
            symbol
          }
        }
      }
    appBalances {
        address
        appId
        network
        balanceUSD
        products {
          label
          assets {
            type
            address
            network
            appId
            groupId
            ... on AppTokenPositionBalance {
              type
              address
              network
              balance
              balanceUSD
              price
              symbol
              decimals
              displayProps {
                label
              }
            }
          }
        }
      }
    }
  }
`;



export async function getPortfolioData(addresses: string[], networks: string[], userId: string, runtime: IAgentRuntime): Promise<Portfolio> {
  try {
    // Check cache first
    const cacheKey = `PORTFOLIO-${userId}`;
    const cachedPortfolio = await getMoxieCache(cacheKey, runtime);

    if (cachedPortfolio) {
      return JSON.parse(cachedPortfolio as string);
    }

    // If not in cache, fetch from API
    const portfolioData: PortfolioResponse = await client.post('', {
      query: PortfolioQuery,
      variables: {
        addresses,
        networks
      }
    });

    const portfolio = portfolioData.data.data.portfolio;

    // Cache the result
    await setMoxieCache(JSON.stringify(portfolio), cacheKey, runtime);

    return portfolio;
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw error;
  }
}
