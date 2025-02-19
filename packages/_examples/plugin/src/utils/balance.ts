import { createPublicClient, formatEther, http } from "viem";
import { base } from "viem/chains";
import request, { gql } from "graphql-request";

export const getNativeBalance = async (address: `0x${string}`) => {
    const publicClient = createPublicClient({
        chain: base,
        transport: http(),
    });
    const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
    });
    const balanceAsEther = formatEther(balance);
    return balanceAsEther;
};

export const getTokenBalance = async (
    address: `0x${string}`,
    first: number = 100
) => {
    try {
        const query = gql`
            query TokenBalances($addresses: [Address!]!, $first: Int) {
                portfolioV2(addresses: $addresses) {
                    tokenBalances {
                        totalBalanceUSD
                        byToken(first: $first) {
                            totalCount
                            edges {
                                node {
                                    symbol
                                    tokenAddress
                                    balance
                                    balanceUSD
                                    price
                                    imgUrlV2
                                    name
                                    network {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        const data = await request({
            url: "https://public.zapper.xyz/graphql",
            document: query,
            variables: {
                addresses: [address],
                first,
            },
            requestHeaders: {
                "Content-Type": "application/json",
                Authorization: `Basic ${btoa(process.env.ZAPPER_API_KEY)}`,
            },
        });
        return (data as any)?.portfolioV2?.tokenBalances;
    } catch (error) {
        console.error(error);
        return null;
    }
};
