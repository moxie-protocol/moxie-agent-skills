import { elizaLogger } from "@senpi-ai/core";
import { SENPI_BACKEND_INTERNAL_URL } from "../config";

interface Trader {
    user_id: string;
    username: string;
    total_volume_usd: number;
    total_trades: number;
    tokens_traded: TokenTraded[];
}

interface TokenTraded {
    name: string;
    symbol: string;
    volume_usd: number;
    buy_volume_usd: number;
    sell_volume_usd: number;
}

interface GetTopTradersResponse {
    data: {
        GetTopTraders: {
            top_traders: Trader[];
        };
    };
}

interface GetTopTraderOfATokenResposne {
    data: {
        GetTopTraderOfAToken: {
            top_traders: TopTraderOfAToken[];
        };
    };
}

interface TopTraderOfAToken {
    user_id: string;
    username: string;
    total_volume_usd: number;
    trades_count: number;
    avg_trade_size_usd: number;
    buy_volume_usd: number;
    sell_volume_usd: number;
    buy_count: number;
    sell_count: number;
}

export async function getTopBaseTraders(): Promise<Trader[]> {
    try {
        if (!SENPI_BACKEND_INTERNAL_URL) {
            throw new Error("SENPI_BACKEND_INTERNAL_URL is not set");
        }

        const variables = {
            input: {
                limit: 10,
                filter: {
                    blockchain: "BASE",
                    end_time: "null",
                    start_time: "null",
                },
            },
        };

        const response = await fetch(`${SENPI_BACKEND_INTERNAL_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `
                        query GetTopTraders($input: GetTopTradersInput!) {
                            GetTopTraders(input: $input) {
                                top_traders {
                                user_id
                                username
                                total_volume_usd
                                total_trades
                                tokens_traded {
                                    name
                                    symbol
                                    volume_usd
                                    buy_volume_usd
                                    sell_volume_usd
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

        const data: GetTopTradersResponse = await response.json();
        elizaLogger.info(`Top traders: ${JSON.stringify(data)}`);
        return data.data.GetTopTraders.top_traders;
    } catch (error) {
        elizaLogger.error("Error fetching swap data:", error);
        return [];
    }
}

export async function getTopBaseTraderOfAToken(
    token: string
): Promise<TopTraderOfAToken[]> {
    try {
        if (!SENPI_BACKEND_INTERNAL_URL) {
            throw new Error("SENPI_BACKEND_INTERNAL_URL is not set");
        }

        const variables = {
            input: {
                filter: {
                    start_time: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                    end_time: new Date()
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19),
                    token_address: token,
                },
                limit: 10,
            },
        };

        const response = await fetch(`${SENPI_BACKEND_INTERNAL_URL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query: `
                        query GetTopTraderOfAToken($input: GetTopTraderOfATokenInput!) {
                            GetTopTraderOfAToken(input: $input) {
                                    top_traders {
                                    user_id
                                    username
                                    total_volume_usd
                                    trades_count
                                    avg_trade_size_usd
                                    buy_volume_usd
                                    sell_volume_usd
                                    buy_count
                                    sell_count
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

        const data: GetTopTraderOfATokenResposne = await response.json();
        elizaLogger.info(`Top trader of a token: ${JSON.stringify(data)}`);
        return data.data.GetTopTraderOfAToken.top_traders;
    } catch (error) {
        elizaLogger.error("Error fetching swap data:", error);
        return [];
    }
}
