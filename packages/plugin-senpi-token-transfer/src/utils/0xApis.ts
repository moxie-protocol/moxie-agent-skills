import { elizaLogger } from "@senpi-ai/core";
import { createClientV2 } from "@0x/swap-ts-sdk";
import { Context, GetIndicativePriceResponse } from "../types/types";
import { mockGetIndicativePriceResponse } from "../constants/constants";

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
 * Get 0x price
 * @param senpiUserId - The senpi user id
 * @param sellAmountBaseUnits - The sell amount
 * @param buyTokenAddress - The buy token address
 * @param walletAddress - The wallet address
 * @param sellTokenAddress - The sell token address
 * @returns The price
 */
export const get0xPrice = async ({
    context,
    sellAmountBaseUnits,
    buyTokenAddress,
    walletAddress,
    sellTokenAddress,
}: {
    context: Context;
    sellAmountBaseUnits: string;
    buyTokenAddress: string;
    walletAddress: string;
    sellTokenAddress: string;
}) => {
    try {
        if (!process.env.ZERO_EX_API_KEY) {
            return mockGetIndicativePriceResponse;
        }
        elizaLogger.debug(
            context.traceId,
            `[get0xPrice] [${context.senpiUserId}] input details: [${walletAddress}] [${sellTokenAddress}] [${buyTokenAddress}] [${sellAmountBaseUnits}]`
        );
        const price = (await zxClient.gasless.getPrice.query({
            sellAmount: sellAmountBaseUnits,
            sellToken: sellTokenAddress,
            buyToken: buyTokenAddress,
            chainId: Number(process.env.CHAIN_ID || "8453"),
        })) as GetIndicativePriceResponse;
        elizaLogger.debug(
            context.traceId,
            `[get0xPrice] [${context.senpiUserId}] price: ${JSON.stringify(price)}`
        );
        return price;
    } catch (error) {
        elizaLogger.error(
            context.traceId,
            `[get0xPrice] [${context.senpiUserId}] [ERROR] Failed to get 0x price: ${JSON.stringify(error)}`
        );
        throw new Error("Failed to get price quote. Please try again later.");
    }
};
