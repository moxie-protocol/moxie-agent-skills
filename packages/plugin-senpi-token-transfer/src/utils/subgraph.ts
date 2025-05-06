import { elizaLogger } from "@senpi-ai/core";
import { GraphQLClient } from "graphql-request";
import {
    mockSubjectTokenDetail,
    mockSubjectTokenDetails,
} from "../constants/constants";

const PROTOCOL_SUBGRAPH_URL = process.env.PROTOCOL_SUBGRAPH_URL;

if (!PROTOCOL_SUBGRAPH_URL) {
    elizaLogger.error(
        "PROTOCOL_SUBGRAPH_URL environment variable is not defined, will use mock data"
    );
}

// Add singleton client
const client = new GraphQLClient(PROTOCOL_SUBGRAPH_URL);

/**
 * Fetches the details of a subject token from the protocol subgraph
 * @param traceId Trace ID for logging
 * @param subject The address of the subject token
 * @returns A promise that resolves to the subject token details or null if an error occurs
 */
export async function getSubjectTokenDetailsBySubjectAddress(
    traceId: string,
    subject: string
): Promise<SubjectToken | null> {
    if (!subject) {
        elizaLogger.error(
            traceId,
            `[getSubjectTokenDetailsBySubjectAddress] Subject address is missing`
        );
        throw new Error("Subject address is required");
    }
    if (!PROTOCOL_SUBGRAPH_URL) {
        return mockSubjectTokenDetail;
    }

    const query = `
    query($subject: String!) {
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

    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            elizaLogger.debug(
                traceId,
                `[getSubjectTokenDetailsBySubjectAddress] Fetching details for subject: ${subject}`
            );
            const response = await client.request<SubjectTokenResponse>(query, {
                subject: subject.toLowerCase(),
            });

            if (
                !response.subjectTokens ||
                response.subjectTokens.length === 0
            ) {
                elizaLogger.warn(
                    traceId,
                    `[getSubjectTokenDetailsBySubjectAddress] No subject token found for subject: ${subject}`
                );
                return null;
            }

            return response.subjectTokens[0];
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                elizaLogger.error(
                    traceId,
                    `[getSubjectTokenDetailsBySubjectAddress] [${subject}] Error fetching subject token details after ${maxRetries} attempts: ${error instanceof Error ? error.message : JSON.stringify(error)}`
                );
                return null;
            }
            elizaLogger.warn(
                traceId,
                `[getSubjectTokenDetailsBySubjectAddress] [${subject}] Retry ${retries}/${maxRetries} after error: ${error instanceof Error ? error.message : JSON.stringify(error)}`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries)); // Exponential backoff
        }
    }

    return null; // Explicit return in case loop exits unexpectedly
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
 * @param traceId Trace ID for logging
 * @param subjectTokenAddresses Array of subject token addresses to fetch details for
 * @returns A promise that resolves to a record of subject token details or null if an error occurs
 */
export async function getSubjectTokenDetailsBySubjectTokenAddresses(
    traceId: string,
    subjectTokenAddresses: string[]
): Promise<Record<string, SubjectToken> | null> {
    if (!subjectTokenAddresses || subjectTokenAddresses.length === 0) {
        elizaLogger.error(
            traceId,
            `[getSubjectTokenDetailsBySubjectTokenAddresses] Subject token addresses are missing or empty`
        );
        throw new Error("Subject token addresses are required");
    }
    if (!PROTOCOL_SUBGRAPH_URL) {
        return mockSubjectTokenDetails;
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

    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const normalizedAddresses = subjectTokenAddresses
                .filter((addr) => addr)
                .map((addr) => addr.toLowerCase());

            elizaLogger.debug(
                traceId,
                `[getSubjectTokenDetailsBySubjectTokenAddresses] Fetching details for subject tokens: ${normalizedAddresses.join(", ")}`
            );

            const response = await client.request<SubjectTokenResponse>(query, {
                subjectTokenAddresses: normalizedAddresses,
            });

            if (
                !response.subjectTokens ||
                response.subjectTokens.length === 0
            ) {
                elizaLogger.warn(
                    traceId,
                    `[getSubjectTokenDetailsBySubjectTokenAddresses] No subject tokens found for addresses: ${normalizedAddresses.join(", ")}`
                );
                return null;
            }

            return response.subjectTokens.reduce(
                (acc, token) => {
                    acc[token.id] = token;
                    return acc;
                },
                {} as Record<string, SubjectToken>
            );
        } catch (error) {
            retries++;
            if (retries >= maxRetries) {
                elizaLogger.error(
                    traceId,
                    `[getSubjectTokenDetailsBySubjectTokenAddresses] Error fetching detailed subject token information after ${maxRetries} attempts: ${error instanceof Error ? error.message : JSON.stringify(error)}`
                );
                return null;
            }
            elizaLogger.warn(
                traceId,
                `[getSubjectTokenDetailsBySubjectTokenAddresses] Retry ${retries}/${maxRetries} after error: ${error instanceof Error ? error.message : JSON.stringify(error)}`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000 * retries)); // Exponential backoff
        }
    }

    return null; // Explicit return in case loop exits unexpectedly
}
