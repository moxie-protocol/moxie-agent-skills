import { elizaLogger, IAgentRuntime } from "@moxie-protocol/core";

interface TopTrader {
    user_id: string;
    buy_volume?: number;
    buy_volume_usd?: number;
    sell_volume?: number;
    sell_volume_usd?: number;
    username?: string;
}

interface TokenSwapSummary {
    token_address: string;
    token_symbol: string;
    buy_volume: number;
    sell_volume: number;
    buy_volume_usd: number;
    sell_volume_usd: number;
    unique_buyers: number;
    unique_sellers: number;
    top_buyers: TopTrader[];
    top_sellers: TopTrader[];
}

interface GetUserSwapsSummaryResponse {
    data: {
        GetUserSwapsSummary: {
            user_swap_summaries: TokenSwapSummary[];
        };
    };
}

export async function fetchSwapData(
    userIds: string[],
    fetchOnlyCreatorCoinSwaps: boolean,
    fetchOnlyResultsFromGivenMoxieIds: boolean
): Promise<TokenSwapSummary[]> {
    try {
        const startTime = Date.now();
        const response = await fetch(
            "https://moxie-backend.dev.airstack.xyz/internal-graphql",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query: `
                        query Query($input: GetUserSwapsSummaryInput!) {
                            GetUserSwapsSummary(input: $input) {
                                user_swap_summaries {
                                    token_address
                                    token_symbol
                                    buy_volume
                                    sell_volume
                                    buy_volume_usd
                                    sell_volume_usd
                                    unique_buyers
                                    unique_sellers
                                    top_buyers {
                                        user_id
                                        buy_volume
                                        buy_volume_usd
                                        username
                                    }
                                    top_sellers {
                                        user_id
                                        sell_volume
                                        sell_volume_usd
                                        username
                                    }
                                }
                            }
                        }
          `,
                    variables: {
                        input: {
                            filter: {
                                moxie_ids: userIds,
                                // Get timestamp from 24 hours ago by subtracting milliseconds (24 * 60 * 60 * 1000)
                                // Convert to ISO string, replace T with space, and take first 19 chars (YYYY-MM-DD HH:mm:ss)
                                start_time: new Date(
                                    Date.now() - 24 * 60 * 60 * 1000
                                )
                                    .toISOString()
                                    .replace("T", " ")
                                    .slice(0, 19),
                                // Get current timestamp in same format
                                end_time: new Date()
                                    .toISOString()
                                    .replace("T", " ")
                                    .slice(0, 19),
                                only_creator_coin_swaps:
                                    fetchOnlyCreatorCoinSwaps,
                                only_results_from_given_moxie_ids:
                                    fetchOnlyResultsFromGivenMoxieIds,
                            },
                            sort: {
                                sort_order: "DESC",
                                sort_by: "BUY_VOLUME",
                            },
                            limit: {
                                top_tokens: 5,
                            },
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as GetUserSwapsSummaryResponse;
        const endTime = Date.now();
        elizaLogger.debug(
            `Time taken to fetch swap data: ${endTime - startTime}ms`
        );
        return data.data.GetUserSwapsSummary.user_swap_summaries;
    } catch (error) {
        elizaLogger.error("Error fetching swap data:", error);
        return [];
    }
}
