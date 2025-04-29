import {
    MoxieWalletClient,
    MoxieWalletSendTransactionInputType,
    TransactionDetails,
} from "@senpi-ai/senpi-agent-lib";
import { Context, GetQuoteResponse } from "../types/types";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { ERC20_TXN_SLIPPAGE_BPS } from "../constants";
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

/**
 * Get 0x swap quote
 * @param moxieUserId - The moxie user id
 * @param sellAmountBaseUnits - The sell amount
 * @param buyTokenAddress - The buy token address
 * @param walletAddress - The wallet address
 * @param sellTokenAddress - The sell token address
 * @returns The quote
 */
export const get0xSwapQuote = async ({
    traceId,
    moxieUserId,
    sellAmountBaseUnits,
    buyTokenAddress,
    walletAddress,
    sellTokenAddress,
}: {
    traceId: string;
    moxieUserId: string;
    sellAmountBaseUnits: string;
    buyTokenAddress: string;
    walletAddress: string;
    sellTokenAddress: string;
}) => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            elizaLogger.debug(
                traceId,
                `[get0xSwapQuote] [${moxieUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`
            );
            if (!process.env.ZERO_EX_API_KEY) {
                return mockGetQuoteResponse;
            }
            const quote = (await zxClient.swap.permit2.getQuote.query({
                sellAmount: sellAmountBaseUnits,
                sellToken: sellTokenAddress,
                buyToken: buyTokenAddress,
                chainId: Number(process.env.CHAIN_ID || "8453"),
                taker: walletAddress,
                slippageBps: ERC20_TXN_SLIPPAGE_BPS,
            })) as GetQuoteResponse;

            return quote;
        } catch (error) {
            retryCount++;

            if (retryCount >= MAX_RETRIES) {
                elizaLogger.error(
                    traceId,
                    `[get0xSwapQuote] [${moxieUserId}] [ERROR] Failed to get 0x swap quote after ${MAX_RETRIES} attempts: ${JSON.stringify(error)}`
                );
                throw error;
            }

            elizaLogger.warn(
                traceId,
                `[get0xSwapQuote] [${moxieUserId}] [RETRY ${retryCount}/${MAX_RETRIES}] Failed to get 0x swap quote: ${JSON.stringify(error)}`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

/**
 * Execute 0x swap with 20% buffer for gas limit
 * @param moxieUserId - The moxie user id
 * @param walletAddress - The wallet address
 * @param quote - The quote
 * @returns The transaction response
 */
export const execute0xSwap = async ({
    context,
    quote,
    agentWalletAddress,
    walletClient,
}: {
    context: Context;
    quote: GetQuoteResponse;
    agentWalletAddress: string;
    walletClient: MoxieWalletClient;
}) => {
    const { traceId, moxieUserId, provider } = context;
    elizaLogger.debug(
        traceId,
        `[execute0xSwap] [${moxieUserId}] input details: [${agentWalletAddress}] [${quote.transaction.to}] [${quote.transaction.value}] [${quote.transaction.data}] [${quote.transaction.gas}] [${quote.transaction.gasPrice}]`
    );

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
        try {
            const feeData = await provider.getFeeData();
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${moxieUserId}] feeData: ${JSON.stringify(feeData)}`
            );
            const maxPriorityFeePerGas =
                (BigInt(feeData.maxPriorityFeePerGas!.toString()) *
                    BigInt(120)) /
                BigInt(100);
            const maxFeePerGas =
                (BigInt(feeData.maxFeePerGas!.toString()) * BigInt(120)) /
                BigInt(100);
            const transactionDetails: TransactionDetails = {
                fromAddress: agentWalletAddress,
                toAddress: quote.transaction.to,
                value: Number(quote.transaction.value),
                data: quote.transaction.data,
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
            };
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${moxieUserId}] transactionDetails: ${JSON.stringify(transactionDetails)}`
            );
            const tx = await walletClient.sendTransaction(
                process.env.CHAIN_ID || "8453",
                transactionDetails
            );
            elizaLogger.debug(
                traceId,
                `[execute0xSwap] [${moxieUserId}] tx hash: ${tx.hash}`
            );
            return tx;
        } catch (error) {
            retryCount++;

            if (retryCount >= MAX_RETRIES) {
                elizaLogger.error(
                    traceId,
                    `[execute0xSwap] [${moxieUserId}] [ERROR] Failed to execute 0x swap after ${MAX_RETRIES} attempts: ${JSON.stringify(error)}`
                );
                throw error;
            }

            elizaLogger.warn(
                traceId,
                `[execute0xSwap] [${moxieUserId}] [RETRY ${retryCount}/${MAX_RETRIES}] Failed to execute 0x swap: ${JSON.stringify(error)}`
            );

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
    }
};

// /**
//  * Get 0x price
//  * @param moxieUserId - The moxie user id
//  * @param sellAmountBaseUnits - The sell amount
//  * @param buyTokenAddress - The buy token address
//  * @param walletAddress - The wallet address
//  * @param sellTokenAddress - The sell token address
//  * @returns The price
//  */
// export const get0xPrice = async ({
//     moxieUserId,
//     sellAmountBaseUnits,
//     buyTokenAddress,
//     walletAddress,
//     sellTokenAddress,
// }: {
//     moxieUserId: string;
//     sellAmountBaseUnits: string;
//     buyTokenAddress: string;
//     walletAddress: string;
//     sellTokenAddress: string;
// }) => {
//     try {
//         elizaLogger.debug(`[get0xPrice] [${moxieUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`)
//         const price = (await zxClient.swap.permit2.getPrice.query({
//             sellAmount: sellAmountBaseUnits,
//             sellToken: sellTokenAddress,
//             buyToken: buyTokenAddress,
//             chainId: Number(process.env.CHAIN_ID),
//             slippageBps: ERC20_TXN_SLIPPAGE_BPS
//         })) as GetIndicativePriceResponse;
//         elizaLogger.debug(`[get0xPrice] [${moxieUserId}] price: ${JSON.stringify(price)}`)
//         return price;
//     } catch (error) {
//         elizaLogger.error(`[get0xPrice] [${moxieUserId}] [ERROR] Failed to get 0x price: ${JSON.stringify(error)}`);
//         throw new Error('Failed to get price quote. Please try again later.');
//     }
// };
