import { elizaLogger, IAgentRuntime } from "@senpi-ai/core";
import { SENPI_BACKEND_INTERNAL_URL } from "./config";

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
    buy_volume_usd: number;
    sell_volume_usd: number;
    unique_buyers: number;
    unique_sellers: number;
    net_volume_usd: number;
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
    tokenType: "ALL" | "CREATOR_COIN" | "NON_CREATOR_COIN",
    fetchOnlyResultsFromGivenSenpiIds: boolean,
    timeFilter: {
        startTimestamp: string;
        endTimestamp: string;
    }
): Promise<TokenSwapSummary[]> {
    try {
        const startTime = Date.now();
        let startTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);

        let endTimestamp = new Date()
            .toISOString()
            .replace("T", " ")
            .slice(0, 19);

        if (
            tokenType === "NON_CREATOR_COIN" &&
            timeFilter &&
            timeFilter.startTimestamp != timeFilter.endTimestamp
        ) {
            startTimestamp = timeFilter.startTimestamp;
            endTimestamp = timeFilter.endTimestamp;
        }
        const variables = {
            input: {
                filter: {
                    senpi_ids: userIds,
                    // Get timestamp from 24 hours ago by subtracting milliseconds (24 * 60 * 60 * 1000)
                    // Convert to ISO string, replace T with space, and take first 19 chars (YYYY-MM-DD HH:mm:ss)
                    start_time: startTimestamp,
                    // Get current timestamp in same format
                    end_time: endTimestamp,
                    token_type: tokenType,
                    only_results_from_given_senpi_ids:
                        fetchOnlyResultsFromGivenSenpiIds,
                },
                sort: {
                    sort_order: "DESC",
                    sort_by: "BUY_VOLUME",
                },
                limit: {
                    top_tokens: 10,
                },
            },
        };

        elizaLogger.debug(`variables: ${JSON.stringify(variables)}`);

        if (!SENPI_BACKEND_INTERNAL_URL) {
            throw new Error("SENPI_BACKEND_INTERNAL_URL is not set");
        }

        const response = await fetch(`${SENPI_BACKEND_INTERNAL_URL}`, {
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
                                    buy_volume_usd
                                    sell_volume_usd
                                    unique_buyers
                                    unique_sellers
                                    net_volume_usd
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
                variables,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as GetUserSwapsSummaryResponse;
        const endTime = Date.now();
        elizaLogger.debug(
            `Time taken to fetch swap data: ${endTime - startTime}ms`
        );

        elizaLogger.debug(`swapdata: ${JSON.stringify(data)}`);
        return data.data.GetUserSwapsSummary.user_swap_summaries;
    } catch (error) {
        elizaLogger.error("Error fetching swap data:", error);
        return [];
    }
}

export function roundToDecimalPlaces(
    num: number,
    decimalPlaces: number
): number {
    // Convert to string to check decimal places
    const numStr = num.toString();

    // Check if the number has a decimal point
    if (numStr.includes(".")) {
        const decimalPart = numStr.split(".")[1];

        // If decimal part has more than 4 digits, round up to 4 decimal places
        if (decimalPart.length > decimalPlaces) {
            // Use Math.ceil with appropriate multiplier/divisor to round up to 4 decimal places
            return (
                Math.ceil(num * Math.pow(10, decimalPlaces)) /
                Math.pow(10, decimalPlaces)
            );
        }
    }

    // Return original number if it has 4 or fewer decimal places
    return num;
}
