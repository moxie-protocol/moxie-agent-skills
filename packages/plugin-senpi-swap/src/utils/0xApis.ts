import {
    SenpiWalletClient,
    SenpiWalletSendTransactionInputType,
} from "@senpi-ai/senpi-agent-lib";
import { GetQuoteResponse } from "../types";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { ERC20_TXN_SLIPPAGE_BPS } from "./constants";
import { mockGetQuoteResponse } from "../constants/constants";

const initializeClients = () => {
    if (!process.env.ZERO_EX_API_KEY) {
        elizaLogger.error(
            "ZERO_EX_API_KEY environment variable is not given, will use mock data"
        );
        return { zxClient: null };
    }

    try {
        const zxClient = createClientV2({
            apiKey: process.env.ZERO_EX_API_KEY,
        });
        return { zxClient };
    } catch (error) {
        elizaLogger.error(`Failed to initialize clients: ${error}`);
        throw new Error("Failed to initialize clients");
    }
};

const { zxClient } = initializeClients();

if (!process.env.CHAIN_ID || isNaN(Number(process.env.CHAIN_ID))) {
    process.env.CHAIN_ID = "8453";
    elizaLogger.error(
        "CHAIN_ID environment variable is not set, using default value 8453"
    );
}

if (!process.env.SWAP_FEE_BPS || isNaN(Number(process.env.SWAP_FEE_BPS))) {
    elizaLogger.error("SWAP_FEE_BPS environment variable is not set");
}

if (!process.env.SWAP_FEE_RECIPIENT) {
    elizaLogger.error("SWAP_FEE_RECIPIENT environment variable is not set");
}

/**
 * Get 0x swap quote
 * @param senpiUserId - The senpi user id
 * @param sellAmountBaseUnits - The sell amount
 * @param buyTokenAddress - The buy token address
 * @param walletAddress - The wallet address
 * @param sellTokenAddress - The sell token address
 * @returns The quote
 */
export const get0xSwapQuote = async ({
    traceId,
    senpiUserId,
    sellAmountBaseUnits,
    buyTokenAddress,
    buyTokenSymbol,
    walletAddress,
    sellTokenAddress,
    sellTokenSymbol,
}: {
    traceId: string;
    senpiUserId: string;
    sellAmountBaseUnits: string;
    buyTokenAddress: string;
    buyTokenSymbol: string;
    walletAddress: string;
    sellTokenAddress: string;
    sellTokenSymbol: string;
}) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            if (!process.env.ZERO_EX_API_KEY) {
                return mockGetQuoteResponse;
            }

            elizaLogger.debug(
                traceId,
                `[get0xSwapQuote] [${senpiUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}] [${buyTokenSymbol}] [${sellTokenSymbol}]`
            );

            const quote = (await zxClient.swap.permit2.getQuote.query({
                sellAmount: sellAmountBaseUnits,
                sellToken: sellTokenAddress,
                buyToken: buyTokenAddress,
                chainId: Number(process.env.CHAIN_ID || "8453"),
                taker: walletAddress,
                slippageBps: ERC20_TXN_SLIPPAGE_BPS,
                swapFeeToken: isStableCoin(buyTokenSymbol)
                    ? buyTokenAddress
                    : isStableCoin(sellTokenSymbol)
                      ? sellTokenAddress
                      : sellTokenAddress, // default to sellToken if neither present in stableCoins env variable
                swapFeeBps: Number(process.env.SWAP_FEE_BPS),
                swapFeeRecipient: process.env.SWAP_FEE_RECIPIENT,
            })) as GetQuoteResponse;

            return quote;
        } catch (error) {
            retryCount++;

            if (retryCount >= MAX_RETRIES) {
                elizaLogger.error(
                    traceId,
                    `[get0xSwapQuote] [${senpiUserId}] [ERROR] Failed to get 0x swap quote after ${MAX_RETRIES} attempts: ${JSON.stringify(error)}`
                );
                throw error;
            }

            elizaLogger.warn(
                traceId,
                `[get0xSwapQuote] [${senpiUserId}] [RETRY ${retryCount}/${MAX_RETRIES}] Failed to get 0x swap quote: ${JSON.stringify(error)}`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

const isStableCoin = (tokenSymbol: string) => {
    // Map of stable coins by symbol
    const stableCoins = (process.env.STABLE_COINS || "USDC,USDT,DAI,ETH,WETH")
        .split(",")
        .map((coin) => coin.trim());
    return stableCoins.includes(tokenSymbol.toUpperCase());
};

/**
 * Execute 0x swap with 20% buffer for gas limit
 * @param senpiUserId - The senpi user id
 * @param walletAddress - The wallet address
 * @param quote - The quote
 * @returns The transaction response
 */
export const execute0xSwap = async ({
    traceId,
    senpiUserId,
    walletAddress,
    quote,
    walletClient,
}: {
    traceId: string;
    senpiUserId: string;
    walletAddress: string;
    quote: GetQuoteResponse;
    walletClient: SenpiWalletClient;
}) => {
    elizaLogger.debug(
        traceId,
        `[execute0xSwap] [${senpiUserId}] input details: [${walletAddress}] [${quote.transaction.to}] [${quote.transaction.value}] [${quote.transaction.data}] [${quote.transaction.gas}] [${quote.transaction.gasPrice}]`
    );

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            const provider = new ethers.JsonRpcProvider(
                process.env.BASE_RPC_URL
            );
            const feeData = await provider.getFeeData();
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${senpiUserId}] feeData: ${JSON.stringify(feeData)}`
            );
            const maxPriorityFeePerGas =
                (feeData.maxPriorityFeePerGas! * BigInt(120)) / BigInt(100);
            const maxFeePerGas =
                (feeData.maxFeePerGas! * BigInt(120)) / BigInt(100);
            const transactionInput: SenpiWalletSendTransactionInputType = {
                address: walletAddress,
                chainType: "ethereum",
                caip2: `eip155:${process.env.CHAIN_ID || "8453"}`,
                transaction: {
                    to: quote.transaction.to,
                    value: Number(quote.transaction.value),
                    data: quote.transaction.data,
                    gasLimit: Math.ceil(Number(quote.transaction.gas) * 1.2), // added 20% buffer
                    gasPrice: Number(quote.transaction.gasPrice),
                    chainId: Number(process.env.CHAIN_ID || "8453"),
                },
            };
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${senpiUserId}] transactionInput: ${JSON.stringify(transactionInput)}`
            );
            const tx = await walletClient.sendTransaction(
                process.env.CHAIN_ID || "8453",
                {
                    fromAddress: walletAddress,
                    toAddress: quote.transaction.to,
                    value: Number(quote.transaction.value),
                    data: quote.transaction.data,
                    gasLimit: Math.ceil(Number(quote.transaction.gas) * 1.2), // added 20% buffer
                    gasPrice: Number(quote.transaction.gasPrice),
                    maxFeePerGas: Number(maxFeePerGas),
                    maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                }
            );
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${senpiUserId}] tx hash: ${tx.hash}`
            );
            return tx;
        } catch (error) {
            retryCount++;

            if (retryCount >= MAX_RETRIES) {
                elizaLogger.error(
                    traceId,
                    `[execute0xSwap] [${senpiUserId}] [ERROR] Failed to execute 0x swap after ${MAX_RETRIES} attempts: ${JSON.stringify(error)}`
                );
                throw new Error(
                    "Failed to execute 0x swap. Please try again later."
                );
            }

            elizaLogger.warn(
                traceId,
                `[execute0xSwap] [${senpiUserId}] [RETRY ${retryCount}/${MAX_RETRIES}] Failed to execute 0x swap: ${JSON.stringify(error)}`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

// /**
//  * Get 0x price
//  * @param senpiUserId - The senpi user id
//  * @param sellAmountBaseUnits - The sell amount
//  * @param buyTokenAddress - The buy token address
//  * @param walletAddress - The wallet address
//  * @param sellTokenAddress - The sell token address
//  * @returns The price
//  */
// export const get0xPrice = async ({
//     senpiUserId,
//     sellAmountBaseUnits,
//     buyTokenAddress,
//     walletAddress,
//     sellTokenAddress,
// }: {
//     senpiUserId: string;
//     sellAmountBaseUnits: string;
//     buyTokenAddress: string;
//     walletAddress: string;
//     sellTokenAddress: string;
// }) => {
//     try {
//         elizaLogger.debug(`[get0xPrice] [${senpiUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`)
//         const price = (await zxClient.swap.permit2.getPrice.query({
//             sellAmount: sellAmountBaseUnits,
//             sellToken: sellTokenAddress,
//             buyToken: buyTokenAddress,
//             chainId: Number(process.env.CHAIN_ID),
//             slippageBps: ERC20_TXN_SLIPPAGE_BPS
//         })) as GetIndicativePriceResponse;
//         elizaLogger.debug(`[get0xPrice] [${senpiUserId}] price: ${JSON.stringify(price)}`)
//         return price;
//     } catch (error) {
//         elizaLogger.error(`[get0xPrice] [${senpiUserId}] [ERROR] Failed to get 0x price: ${JSON.stringify(error)}`);
//         throw new Error('Failed to get price quote. Please try again later.');
//     }
// };
