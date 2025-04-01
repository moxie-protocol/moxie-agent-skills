import { MoxieWalletClient, MoxieWalletSendTransactionInputType, TransactionDetails } from "@moxie-protocol/moxie-agent-lib";
import { Context, GetQuoteResponse } from "../types/types";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { elizaLogger } from "@moxie-protocol/core";
import { ethers } from "ethers";
import { ERC20_TXN_SLIPPAGE_BPS } from "../constants";
import { mockGetQuoteResponse } from "../constants/constants";

const initializeClients = () => {
    if (!process.env.ZERO_EX_API_KEY) {
        throw new Error('ZERO_EX_API_KEY environment variable is required');
    }

    try {
        const zxClient = createClientV2({
            apiKey: process.env.ZERO_EX_API_KEY,
        });
        return { zxClient };
    } catch (error) {
        elizaLogger.error(`Failed to initialize clients: ${error}`);
        throw new Error('Failed to initialize clients');
    }
};

const { zxClient } = initializeClients();

if (!process.env.CHAIN_ID || isNaN(Number(process.env.CHAIN_ID))) {
    throw new Error('Valid CHAIN_ID environment variable is required');
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
    try {
        elizaLogger.debug(traceId,`[get0xSwapQuote] [${moxieUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`)
        if(!process.env.ZERO_EX_API_KEY) {
            return mockGetQuoteResponse;
        }
        const quote = (await zxClient.swap.permit2.getQuote.query({
            sellAmount: sellAmountBaseUnits,
            sellToken: sellTokenAddress,
            buyToken: buyTokenAddress,
            chainId: Number(process.env.CHAIN_ID),
            taker: walletAddress,
            slippageBps: ERC20_TXN_SLIPPAGE_BPS
        })) as GetQuoteResponse;

        return quote;
    } catch (error) {
        elizaLogger.error(traceId,`[get0xSwapQuote] [${moxieUserId}] [ERROR] Failed to get 0x swap quote]: ${JSON.stringify(error)}`);
        throw error;
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
    elizaLogger.debug(traceId,`[execute0xSwap] [${moxieUserId}] input details: [${agentWalletAddress}] [${quote.transaction.to}] [${quote.transaction.value}] [${quote.transaction.data}] [${quote.transaction.gas}] [${quote.transaction.gasPrice}]`)

    try {

        const feeData = await provider.getFeeData();
        elizaLogger.debug(traceId,`[execute0xSwap] [${moxieUserId}] feeData: ${JSON.stringify(feeData)}`)
        const maxPriorityFeePerGas = (BigInt(feeData.maxPriorityFeePerGas!.toString()) * BigInt(120)) / BigInt(100);
        const maxFeePerGas = (BigInt(feeData.maxFeePerGas!.toString()) * BigInt(120)) / BigInt(100);
        const transactionDetails: TransactionDetails = {
            fromAddress: agentWalletAddress,
            toAddress: quote.transaction.to,
            value: Number(quote.transaction.value),
            data: quote.transaction.data,
            maxFeePerGas: Number(maxFeePerGas),
            maxPriorityFeePerGas: Number(maxPriorityFeePerGas)
        }
        elizaLogger.debug(traceId,`[execute0xSwap] [${moxieUserId}] transactionDetails: ${JSON.stringify(transactionDetails)}`)
        const tx = await walletClient.sendTransaction(process.env.CHAIN_ID, transactionDetails);
        elizaLogger.debug(traceId,`[execute0xSwap] [${moxieUserId}] tx hash: ${tx.hash}`)
        return tx;
    } catch (error) {
        elizaLogger.error(traceId,'[execute0xSwap] [${moxieUserId}] [ERROR] Error executing 0x swap:', {error});
        throw error;
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