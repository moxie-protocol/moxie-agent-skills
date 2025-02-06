import { PrivyClient } from "@privy-io/server-auth";
import { EthereumSendTransactionInputType } from "@privy-io/server-auth";
import { GetIndicativePriceResponse, GetQuoteResponse } from "../types";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { elizaLogger } from "@elizaos/core";


const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);


const zxClient = createClientV2({
    apiKey: process.env.ZERO_EX_API_KEY,
});


export const get0xSwapQuote = async ({
    moxieUserId,
    sellAmountBaseUnits,
    buyTokenAddress,
    walletAddress,
    sellTokenAddress,
}: {
    moxieUserId: string;
    sellAmountBaseUnits: string;
    buyTokenAddress: string;
    walletAddress: string;
    sellTokenAddress: string;
}) => {
    try {
        elizaLogger.debug(`[get0xSwapQuote] [${moxieUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`)
        const quote = (await zxClient.swap.permit2.getQuote.query({
            sellAmount: sellAmountBaseUnits,
            sellToken: sellTokenAddress,
            buyToken: buyTokenAddress,
            chainId: Number(process.env.CHAIN_ID),
            taker: walletAddress,
        })) as GetQuoteResponse;

        return quote;
    } catch (error) {
        elizaLogger.error(`[get0xSwapQuote] [${moxieUserId}] [ Failed to get 0x swap quote]: ${JSON.stringify(error)}`);
        throw new Error('Failed to get swap quote. Please try again later.');
    }
};


export const execute0xSwap = async ({
    moxieUserId,
    walletAddress,
    quote,
}: {
    moxieUserId: string;
    walletAddress: string;
    quote: GetQuoteResponse;
}) => {
    elizaLogger.debug(`[execute0xSwap] [${moxieUserId}] input details: [${walletAddress}] [${quote.transaction.to}] [${quote.transaction.value}] [${quote.transaction.data}] [${quote.transaction.gas}] [${quote.transaction.gasPrice}]`)

    try {
        const transactionInput: EthereumSendTransactionInputType = {
            address: walletAddress,
            chainType: "ethereum",
            caip2: `eip155:${process.env.CHAIN_ID}`,
            transaction: {
                to: quote.transaction.to,
                value: Number(quote.transaction.value),
                data: quote.transaction.data,
                gasLimit: Number(quote.transaction.gas),
                gasPrice: Number(quote.transaction.gasPrice),
                chainId: Number(process.env.CHAIN_ID),
            },
        };
        elizaLogger.debug(`[execute0xSwap] [${moxieUserId}] transactionInput: ${JSON.stringify(transactionInput)}`)
        const tx = await privy.walletApi.ethereum.sendTransaction(transactionInput);
        elizaLogger.debug(`[execute0xSwap] [${moxieUserId}] tx hash: ${tx.hash}`)
        return tx;
    } catch (error) {
        elizaLogger.error(`[execute0xSwap] [${moxieUserId}] Error executing 0x swap: ${JSON.stringify(error)}`)
        throw new Error('Failed to execute 0x swap. Please try again later.');
    }
};

export const get0xPrice = async ({
    moxieUserId,
    sellAmountBaseUnits,
    buyTokenAddress,
    walletAddress,
    sellTokenAddress,
}: {
    moxieUserId: string;
    sellAmountBaseUnits: string;
    buyTokenAddress: string;
    walletAddress: string;
    sellTokenAddress: string;
}) => {
    try {
        elizaLogger.debug(`[get0xPrice] [${moxieUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`)
        const price = (await zxClient.swap.permit2.getPrice.query({
            sellAmount: sellAmountBaseUnits,
            sellToken: sellTokenAddress,
            buyToken: buyTokenAddress,
            chainId: Number(process.env.CHAIN_ID),
        })) as GetIndicativePriceResponse;
        elizaLogger.debug(`[get0xPrice] [${moxieUserId}] price: ${JSON.stringify(price)}`)
        return price;
    } catch (error) {
        elizaLogger.error(`[get0xPrice] [${moxieUserId}] [ Failed to get 0x swap quote]: ${JSON.stringify(error)}`);
        throw new Error('Failed to get swap quote. Please try again later.');
    }
};