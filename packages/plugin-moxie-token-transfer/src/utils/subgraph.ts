import { GraphQLClient } from 'graphql-request';

const PROTOCOL_SUBGRAPH_URL = process.env.PROTOCOL_SUBGRAPH_URL;


if (!PROTOCOL_SUBGRAPH_URL) {
    throw new Error('PROTOCOL_SUBGRAPH_URL environment variable is not defined');
}

// Add singleton client
const client = new GraphQLClient(PROTOCOL_SUBGRAPH_URL);

/**
 * Fetches the details of a subject token from the protocol subgraph
 * @param subject The address of the subject token
 * @returns A promise that resolves to the subject token details or null if an error occurs
 */
export async function getSubjectTokenDetailsBySubjectAddress(subject: string): Promise<SubjectToken | null> {
    if (!subject) {
        throw new Error('Subject address is required');
    }

    const query = `
    query($subject: String) {
      subjectTokens(where: {subject: $subject}) {
        id
        name
        symbol
        decimals
        currentPriceInMoxie
        currentPriceInWeiInMoxie
        subject {
          id
        }
      }
    }
  `;

    try {
        const response = await client.request<SubjectTokenResponse>(query, { subject: subject.toLowerCase() });
        return response.subjectTokens[0] || null;
    } catch (error) {
        console.error('Error fetching subject token details:', {
            subject,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}

export interface SubjectToken {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    currentPriceInMoxie: string;
    currentPriceInWeiInMoxie: string;
    reserve: string;
    reserveRatio: string;
    totalSupply: string;
    initialSupply: string;
    uniqueHolders: string;
    lifetimeVolume: string;
    subjectFee: string;
    protocolFee: string;
    buySideVolume: string;
    sellSideVolume: string;
    totalStaked: string;
    protocolTokenInvested: string;
    marketCap: string;
    subject: {
        id: string;
    };
}

interface SubjectTokenResponse {
    subjectTokens: SubjectToken[];
}

/**
 * Fetches detailed subject token information for given subject token addresses from the protocol subgraph
 * @param subjectTokenAddresses Array of subject token addresses to fetch details for
 * @returns A promise that resolves to a record of subject token details or null if an error occurs
 */
export async function getSubjectTokenDetailsBySubjectTokenAddresses(subjectTokenAddresses: string[]): Promise<Record<string, SubjectToken> | null> {
    if (!subjectTokenAddresses || subjectTokenAddresses.length === 0) {
        throw new Error('Subject token addresses are required');
    }

    const query = `
        query($subjectTokenAddresses: [String!]!) {
            subjectTokens(where: { id_in: $subjectTokenAddresses }) {
                id
                name
                symbol
                decimals
                reserve
                currentPriceInMoxie
                currentPriceInWeiInMoxie
                reserveRatio
                totalSupply
                initialSupply
                uniqueHolders
                lifetimeVolume
                subjectFee
                protocolFee
                buySideVolume
                sellSideVolume
                totalStaked
                protocolTokenInvested
                marketCap
                subject {
                    id
                }
            }
        }
    `;

    try {
        const response = await client.request<SubjectTokenResponse>(
            query,
            { subjectTokenAddresses: subjectTokenAddresses.filter(addr => addr).map(addr => addr.toLowerCase()) }
        );
        if (!response.subjectTokens) return null;
        return response.subjectTokens.reduce((acc, token) => {
            acc[token.id] = token;
            return acc;
        }, {} as Record<string, SubjectToken>);
    } catch (error) {
        console.error('Error fetching detailed subject token information:', {
            subjectTokenAddresses,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}