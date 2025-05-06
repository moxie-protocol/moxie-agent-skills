import { elizaLogger } from "@senpi-ai/core";
import { BASE_NETWORK_ID, ETH_ADDRESS, WETH_ADDRESS } from "../constants";
import { getTokenDetails } from "@senpi-ai/senpi-agent-lib";
import { ethers } from "ethers";
import { Decimal } from "decimal.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Get the price of a token in USD and calculate equivalent amount in target token
 * @param traceId Trace ID for logging
 * @param senpiUserId User ID performing the operation
 * @param amount Amount of source token in WEI
 * @param sourceTokenAddress Address of source token
 * @param sourceTokenDecimals Decimals of source token
 * @param sourceTokenSymbol Symbol of source token
 * @param targetTokenAddress Address of target token
 * @param targetTokenDecimals Decimals of target token
 * @param targetTokenSymbol Symbol of target token
 * @returns Amount of target tokens in WEI that can be bought with the source amount
 */
export async function getPrice(
    traceId: string,
    senpiUserId: string,
    amount: string,
    sourceTokenAddress: string,
    sourceTokenDecimals: number,
    sourceTokenSymbol: string,
    targetTokenAddress: string,
    targetTokenDecimals: number,
    targetTokenSymbol: string
): Promise<string> {
    try {
        elizaLogger.debug(
            traceId,
            `[getPrice] started with [${senpiUserId}] ` +
                `[amount]: ${amount}, ` +
                `[sourceTokenAddress]: ${sourceTokenAddress}, ` +
                `[sourceTokenDecimals]: ${sourceTokenDecimals}, ` +
                `[sourceTokenSymbol]: ${sourceTokenSymbol}, ` +
                `[targetTokenAddress]: ${targetTokenAddress}, ` +
                `[targetTokenDecimals]: ${targetTokenDecimals}, ` +
                `[targetTokenSymbol]: ${targetTokenSymbol}`
        );

        // Convert ETH addresses to WETH for price lookup
        // if (sourceTokenAddress === ETH_ADDRESS) {
        //     sourceTokenAddress = WETH_ADDRESS;
        // }
        // if (targetTokenAddress === ETH_ADDRESS) {
        //     targetTokenAddress = WETH_ADDRESS;
        // }

        // Get USD prices from CoW API
        let sourceTokenPriceInUSD: number | undefined;
        let targetTokenPriceInUSD: number | undefined;

        // Fetch source token price
        // Fetch both token prices in parallel
        [sourceTokenPriceInUSD, targetTokenPriceInUSD] = await Promise.all([
            fetchPriceWithRetry(
                sourceTokenAddress,
                sourceTokenSymbol,
                traceId,
                senpiUserId
            ),
            fetchPriceWithRetry(
                targetTokenAddress,
                targetTokenSymbol,
                traceId,
                senpiUserId
            ),
        ]);

        if (!sourceTokenPriceInUSD || !targetTokenPriceInUSD) {
            throw new Error("Failed to get valid prices from CoW API");
        }

        // Convert source amount from WEI to standard units
        const amountInEther = ethers.utils.formatUnits(
            amount,
            sourceTokenDecimals
        );

        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${sourceTokenSymbol}] amount in ether: ${amountInEther}`
        );

        // Calculate equivalent amount in target token using USD prices
        const amountInTargetToken = new Decimal(amountInEther)
            .mul(sourceTokenPriceInUSD)
            .div(targetTokenPriceInUSD)
            .toString();

        // Format to correct decimal places and remove trailing zeros
        const amountInTargetTokenFixed = new Decimal(amountInTargetToken)
            .toFixed(targetTokenDecimals)
            .replace(/\.?0+$/, "");

        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${targetTokenSymbol}] amount: ${amountInTargetTokenFixed}`
        );

        // Convert back to WEI
        return ethers.utils
            .parseUnits(amountInTargetTokenFixed, targetTokenDecimals)
            .toString();
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[getPrice] [${senpiUserId}] [ERROR] Unhandled error: ${error.message}`
        );
        throw error;
    }
}

// Helper function to fetch price with retries
export async function fetchPriceWithRetry(
    tokenAddress: string,
    tokenSymbol: string,
    traceId: string,
    senpiUserId: string
): Promise<number> {
    let lastError;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (tokenSymbol === "ETH") {
                // CoW API does not support ETH, so we use WETH
                tokenAddress = WETH_ADDRESS;
            }
            const cowResponse = await fetch(
                `https://bff.cow.fi/${BASE_NETWORK_ID}/tokens/${tokenAddress}/usdPrice`
            );
            const cowPriceData = await cowResponse.json();
            elizaLogger.debug(
                traceId,
                `[getPrice] [${senpiUserId}] [COW_PRICE] [${tokenSymbol}] ${JSON.stringify(cowPriceData)}`
            );
            if (!cowPriceData.price) {
                throw new Error(`Failed to get ${tokenSymbol} price from CoW API`);
            }
            return cowPriceData.price;
        } catch (error) {
            lastError = error;
            elizaLogger.warn(
                traceId,
                `[getPrice] [${senpiUserId}] [RETRY ${i + 1}/${MAX_RETRIES}] [${tokenSymbol}] Failed to get price from CoW API: ${error}`
            );
            if (i < MAX_RETRIES - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, RETRY_DELAY)
                );
            }
        }
    }
    elizaLogger.error(
        traceId,
        `[getPrice] [${senpiUserId}] [ERROR] [${tokenSymbol}] Failed to get price from CoW API after ${MAX_RETRIES} retries: ${lastError}`
    );
    throw new Error(
        `Failed to get ${tokenSymbol} price from CoW API after ${MAX_RETRIES} retries`
    );
}
