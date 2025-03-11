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
        };
    };
}

const AIRSTACK_API_ENDPOINT = process.env.AIRSTACK_GRAPHQL_ENDPOINT;

export async function fetchPortfolioByMoxieIdOrderByTVL(
    moxieId: string,
    limit: number = 10
): Promise<MoxiePortfolio[]> {
    try {
        const response = await fetch(AIRSTACK_API_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: /* GraphQL */ `
                    query GetPortfolio($moxieId: String!, $limit: Int) {
                        MoxieUserPortfolios(
                            input: {
                                filter: { moxieUserId: { _eq: $moxieId } }
                                order: { totalTvl: DESC }
                                limit: $limit
                            }
                        ) {
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
                    moxieId,
                    limit,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as MoxiePortfolioResponse;
        return data.data.MoxieUserPortfolios.MoxieUserPortfolio;
    } catch (error) {
        console.error("Error fetching portfolio:", error);
        return [];
    }
}
