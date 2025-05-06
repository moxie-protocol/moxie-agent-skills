import { IAgentRuntime } from "@senpi-ai/core";
import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";

export interface SenpiPortfolioInfo {
    fanTokenSymbol: string;
    fanTokenName: string;
    fanTokenAddress: string;
    totalLockedAmount: number;
    totalUnlockedAmount: number;
    totalAmount: number;
    totalTvl: number;
    walletAddresses: string[];
    currentPrice: number;
    lockedTvl: number;
    unlockedTvl: number;
    totalTvlInUSD: number;
    lockedTvlInUSD: number;
    unlockedTvlInUSD: number;
    fanTokenSenpiUserId: string;
    displayLabel: string;
    holdingPercentage: number;
}

interface SenpiPortfolioResponse {
    errors?: Array<{
        message: string;
    }>;
    data: {
        MoxieUserPortfolios: {
            MoxieUserPortfolio: SenpiPortfolioInfo[];
        };
    };
}

export async function getMoxiePortfolioInfo(
    senpiUserId: string,
    runtime: IAgentRuntime
): Promise<SenpiPortfolioInfo[] | undefined> {
    try {
        // Check cache first
        const cacheKey = `portfolio-info-${senpiUserId}`;
        const cachedData = await runtime.cacheManager.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData as string);
        }

        const query = `
      query GetPortfolioInfo {
        MoxieUserPortfolios(
          input: {filter: {senpiUserId: {_eq: "${senpiUserId}"}}, order: {totalTvl: DESC} limit:50}
        ) {
          MoxieUserPortfolio {
            fanTokenSymbol
            fanTokenName
            fanTokenAddress
            fanTokenSenpiUserId
            totalLockedAmount
            totalUnlockedAmount
            totalTvl
            walletAddresses
            currentPrice
            lockedTvl
            unlockedTvl
          }
        }
      }
    `;

        let attempts = 0;
        const maxAttempts = 3;
        const backoffMs = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    process.env.AIRSTACK_GRAPHQL_ENDPOINT,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            query,
                            operationName: "GetPortfolioInfo",
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result =
                    (await response.json()) as SenpiPortfolioResponse;

                if (!result.data?.MoxieUserPortfolios?.MoxieUserPortfolio) {
                    elizaLogger.error(
                        `No portfolio data found for user ${senpiUserId}`
                    );
                    return undefined;
                }

                // Cache the result
                await runtime.cacheManager.set(
                    cacheKey,
                    JSON.stringify(
                        result.data.MoxieUserPortfolios.MoxieUserPortfolio
                    ),
                    {
                        expires: Date.now() + 120000,
                    }
                );

                return result.data.MoxieUserPortfolios.MoxieUserPortfolio;
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    elizaLogger.error(
                        `Failed after ${maxAttempts} attempts:`,
                        error
                    );
                    return undefined;
                }
                elizaLogger.warn(
                    `API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffMs * attempts)
                );
            }
        }
    } catch (error) {
        elizaLogger.error("Error fetching portfolio info:", error);
        return undefined;
    }
}

/**
 * Get the portfolio info for a creator token
 * @param senpiUserId - The senpi user id
 * @param creatorToken - The creator token details
 * @returns The portfolio info for the creator token or undefined if no portfolio info is found
 */
export async function getMoxiePortfolioInfoByCreatorTokenDetails(
    senpiUserId: string,
    creatorToken: {
        address?: string;
        name?: string;
        symbol?: string;
    }
): Promise<SenpiPortfolioInfo[] | undefined> {
    try {
        elizaLogger.debug(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] Getting portfolio info for user ${senpiUserId} and creator token ${JSON.stringify(creatorToken)}`
        );

        // Validate that at least one token detail is provided
        if (
            !creatorToken.address &&
            !creatorToken.name &&
            !creatorToken.symbol
        ) {
            throw new Error("Creator token details are required");
        }

        // Validate token details if provided
        if (creatorToken.address && !ethers.isAddress(creatorToken.address)) {
            throw new Error("Invalid token address");
        }

        if (creatorToken.name && creatorToken.name.length === 0) {
            throw new Error("Invalid token name");
        }

        if (creatorToken.symbol && creatorToken.symbol.length === 0) {
            throw new Error("Invalid token symbol");
        }

        // Build filter conditions
        const filterConditions = [
            `senpiUserId: {_eq: "${senpiUserId}"}`,
            ...(creatorToken.address
                ? [`fanTokenAddress: {_eq: "${creatorToken.address}"}`]
                : []),
            ...(creatorToken.name
                ? [`fanTokenName: {_eq: "${creatorToken.name}"}`]
                : []),
            ...(creatorToken.symbol
                ? [`fanTokenSymbol: {_eq: "${creatorToken.symbol}"}`]
                : []),
        ];

        elizaLogger.debug(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] Filter conditions: ${filterConditions.join(", ")}`
        );

        const query = `
      query GetPortfolioInfo {
        MoxieUserPortfolios(
          input: {filter: {${filterConditions.join(", ")}}}
        ) {
          MoxieUserPortfolio {
            fanTokenSymbol
            fanTokenName
            fanTokenAddress
            totalLockedAmount
            totalUnlockedAmount
            totalTvl
            walletAddresses
            currentPrice
            lockedTvl
            unlockedTvl
          }
        }
      }
    `;

        let attempts = 0;
        const maxAttempts = 3;
        const backoffMs = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    process.env.AIRSTACK_GRAPHQL_ENDPOINT,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            query,
                            operationName: "GetPortfolioInfo",
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result =
                    (await response.json()) as SenpiPortfolioResponse;

                if (result.errors) {
                    elizaLogger.error(
                        `Error fetching portfolio info for user ${senpiUserId}:`,
                        result.errors
                    );
                    throw new Error(
                        `Error fetching portfolio info for user ${senpiUserId}: ${result.errors[0].message}`
                    );
                }

                if (!result.data?.MoxieUserPortfolios?.MoxieUserPortfolio) {
                    elizaLogger.error(
                        `No portfolio data found for user ${senpiUserId}`
                    );
                    return undefined;
                }

                const portfolioInfo =
                    result.data.MoxieUserPortfolios.MoxieUserPortfolio;
                elizaLogger.debug(
                    `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] Portfolio response: ${JSON.stringify(portfolioInfo)}`
                );
                return portfolioInfo;
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    elizaLogger.error(
                        `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] Failed after ${maxAttempts} attempts:`,
                        error
                    );
                    throw error;
                }
                elizaLogger.warn(
                    `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffMs * attempts)
                );
            }
        }
    } catch (error) {
        elizaLogger.error(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${senpiUserId}] Error fetching portfolio info:`,
            error
        );
        throw error;
    }
}
