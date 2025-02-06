import {
    composeContext,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
    generateObjectDeprecated,
} from "@elizaos/core";
import { parseUnits } from "viem";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { swapTemplate } from "../templates";
import { z } from "zod";
import { GetIndicativePriceResponse, GetQuoteResponse } from "../types";
import { getNativeTokenBalance } from "../utils/erc20Balance";
import { EthereumSendTransactionInputType, PrivyClient, Wallet } from "@privy-io/server-auth";


export const SwapTokenRequestSchema = z.object({
    sellTokenSymbol: z.string().nullable(),
    sellAmount: z.number().nullable(),
    buyTokenSymbol: z.string().nullable(),
    chain: z.string().nullable(),
});

export interface SwapTokenRequestContent {
    sellTokenSymbol: string;
    sellAmount: number;
    buyTokenSymbol: string;
    chain: string;
}

export const erc20swapAction =  {
    suppressInitialMessage: true,
    name: "ETH_SWAP_OR_BUY_MOXIE_OR_ANY_TOKEN",
    similes: [
        "BUY_MOXIE_WITH_ETH",
        "BUY_ANY_TOKEN",
        "SELL_ETH_FOR_ANY_TOKEN",
        "SWAP_ETH_FOR_ANY_TOKEN",
        "SWAP_ETH_FOR_MOXIE",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        if(message.content.text.toLowerCase().includes("@[")) {
            return false
        }
        //Need to check if the user has a wallet address
        //Validate Privy API Key and Secret and 0x API Key
        return true;
    },
    description: "Swap ETH for MOXIE or any ERC20 token",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[Swap ERC20] Starting swap for MOXIE");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const agentWallet  = state.agentWallet as Wallet
        console.log(agentWallet)

        const walletAddress = agentWallet.address;
        elizaLogger.log(`[Swap ERC20] Processing wallet address: ${walletAddress}`);

        if (!walletAddress) {
            await callback({
                text: "Please provide a valid wallet address",
            });
            return false;
        }

        try {

            const context = composeContext({
                state,
                template: swapTemplate,
            });

            const content = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                // schema: SwapTokenRequestSchema,
            });

            elizaLogger.log("[Swap] Generated content", content);
            // if (!isSwapTokenRequestContent(content)) {
            //     const missingFields = getMissingSwapTokenRequestContent(
            //         content
            //     );
            //     await callback({
            //         text: `Need more information about the swap. Please provide me ${missingFields}`,
            //     });
            //     return;
            // }

            let { sellToken, sellAmount, buyToken, buyAmount, chain, isUSDTransfer } = content;
            let chainId = chain === "base" ? 8453 : -1;
            if (chainId === -1) {
                await callback({
                    text: "Chain not supported",
                });
                return false;
            }

            if (sellToken.toUpperCase() !== "ETH") {
                await callback({
                    text: "You can only swap ETH change sellToken",
                });
                return false;
            }

            if (buyToken.toUpperCase() !== "MOXIE" && !/^0x[a-fA-F0-9]{40}$/.test(buyToken)) {
                await callback({
                    text: "You can only swap ETH for MOXIE or provide a valid 0x Ethereum address as the buy token.",
                });
                return false;
            }

            let buyTokenAddress = buyToken;
            if (buyToken.toUpperCase() == "MOXIE") {
                buyTokenAddress = "0x8C9037D1Ef5c6D1f6816278C7AAF5491d24CD527"
            }

            const zxClient = createClientV2({
                apiKey: process.env.ZERO_EX_API_KEY,
            });

            if(!sellAmount) {
                sellAmount = "0"
            }

            let sellAmountBaseUnits = parseUnits(
                sellAmount.toString(),
                18,
            ).toString();

            //This means user directly wants to purchase x quantity of buyToken, for this we need to first get price of buyToken in ETH and set as sellAmount
            if (buyAmount && buyAmount.toString() !== "0") {
                let decimals = 18;
                let buySwapAddress = buyTokenAddress
                if (isUSDTransfer) {
                    decimals = 6;
                    buySwapAddress = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
                }
                const buyAmountBaseUnits = parseUnits(
                    buyAmount.toString(),
                    decimals,
                ).toString();
                const price = (await zxClient.swap.permit2.getPrice.query({
                    sellAmount: buyAmountBaseUnits,
                    sellToken: buySwapAddress,
                    buyToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    chainId,
                })) as GetIndicativePriceResponse;

                sellAmountBaseUnits = price.buyAmount;
            }

            //We need to get the price of USD in ETH and set as sellAmount
            if (!buyAmount && isUSDTransfer) {
                sellAmountBaseUnits = parseUnits(
                    sellAmount.toString(),
                    6,
                ).toString();
                const price = (await zxClient.swap.permit2.getPrice.query({
                    sellAmount: sellAmountBaseUnits,
                    sellToken: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                    buyToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    chainId,
                })) as GetIndicativePriceResponse;

                sellAmountBaseUnits = price.buyAmount.toString();
            }

            const nativeTokenBalance = await getNativeTokenBalance(walletAddress);


            //Validation to check if the user has enough native token balance to perform the swap
            if (BigInt(sellAmountBaseUnits) > BigInt(nativeTokenBalance)) {
                await callback({
                    text: "Insufficient native token balance to perform the swap.",
                });
                return false;
            }

            elizaLogger.info("Getting quote for:", {
                sellToken: sellToken,
                buyToken: buyTokenAddress,
                amount: sellAmountBaseUnits,
            });

            //Now we have the buy sell chain and sellAmount present we need to call the 0x API to get the quote
            //getQuote requires takerAddress
            const quote = (await zxClient.swap.permit2.getQuote.query({
                sellAmount: sellAmountBaseUnits,
                sellToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                buyToken: buyTokenAddress,
                chainId,
                taker: walletAddress,
            })) as GetQuoteResponse;


            elizaLogger.log("[Swap] Quote received", quote);

            if (!quote.liquidityAvailable) {
                await callback({
                    text: "No liquidity available for this swap. Please try again with a different token or amount.",
                });
                return;
            }

            const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);
            let transactionInput: EthereumSendTransactionInputType = {
                address: walletAddress,
                chainType: "ethereum",
                caip2: `eip155:${chainId}`,
                transaction: {
                    to: quote.transaction.to,
                    value: Number(quote.transaction.value),
                    data: quote.transaction.data,
                    gasLimit: Number(quote.transaction.gas),
                    gasPrice: Number(quote.transaction.gasPrice),
                    chainId: chainId,
                },
            };
            let tx = await privy.walletApi.ethereum.sendTransaction(transactionInput);
            if ('hash' in tx) {
                elizaLogger.log("[Swap] TxHash received", tx.hash);
                await callback({
                    text: `Swap completed successfully! Transaction Hash: ${tx.hash} https://basescan.org/tx/${tx.hash}`,
                    content: {
                        success: true,
                        hash: tx.hash,
                        url: `https://basescan.org/tx/${tx.hash}`,
                    },
                });
            } else {
                elizaLogger.error("[Swap] Error sending transaction:", tx);
                await callback({
                    text: `Error sending transaction: ${tx}`,
                    content: { error: tx },
                });
                return false;
            }

        } catch (error) {
            elizaLogger.error("[Swap] Error swapping ETH for Moxie:", error);
            if (callback) {
                await callback({
                    text: `Error swapping token: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to swap 0.02 ETH for MOXIE",
                    action: "ETH_SWAP_OR_BUY_MOXIE_OR_ANY_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction Hash: ...",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can I exchange 0.01 ETH for MOXIE?",
                    action: "ETH_SWAP_OR_BUY_MOXIE_OR_ANY_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction Hash: ...",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I would like to trade 0.05 ETH for 0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction Hash: ...",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I would like to buy 10 MOXIE",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Swap completed successfully! Transaction Hash: ...",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I would like to trade 0.05 DEGEN for 0x4ed4e862860bed51a9570b96d89af5e1b0efefed",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You can only swap ETH change sellToken",
                },
            },
        ],
    ],
    template: swapTemplate,
} as Action;


export const isSwapTokenRequestContent = (
    object: any
): object is SwapTokenRequestContent => {
    if (SwapTokenRequestSchema.safeParse(object).success) {
        return true;
    }
    return false;
};

export const getMissingSwapTokenRequestContent= (
    content: Partial<SwapTokenRequestContent>
): string => {
    const missingFields = [];

    if (typeof content.sellTokenSymbol !== "string")
        missingFields.push("sell token");
    if (typeof content.buyTokenSymbol !== "string")
        missingFields.push("buy token");
    if (typeof content.sellAmount !== "number")
        missingFields.push("sell amount");

    return missingFields.join(" and ");
};
