import { elizaLogger } from "@senpi-ai/core";
import { BASE_NETWORK_ID, ETH_ADDRESS, WETH_ADDRESS } from "./constants";
import { getTokenDetails } from "@senpi-ai/senpi-agent-lib";
import { ethers } from "ethers";
import { Decimal } from "decimal.js";

/**
 * Get the price of a token in USD
 * @param context
 * @param amount
 * @param tokenAddress
 * @param tokenDecimals
 * @param output
 * @returns the amount of tokens equivalent to the USD amount
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

        // check if the source token is ETH
        if (sourceTokenAddress === ETH_ADDRESS) {
            sourceTokenAddress = WETH_ADDRESS;
        }
        // check if the target token is ETH
        if (targetTokenAddress === ETH_ADDRESS) {
            targetTokenAddress = WETH_ADDRESS;
        }

        const tokenDetails = await getTokenDetails([
            sourceTokenAddress,
            targetTokenAddress,
        ]);
        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [TOKEN_DETAILS] ${JSON.stringify(tokenDetails)}`
        );

        if (!tokenDetails || tokenDetails.length === 0) {
            elizaLogger.error(
                traceId,
                `[getPrice] [${senpiUserId}] [ERROR] Error getting token details: ${tokenDetails}`
            );
            throw new Error(
                `Failed to get token details from codex with error`
            );
        }

        const sourceTokenDetail = tokenDetails.find(
            (token) =>
                token.tokenAddress.toLowerCase() ===
                sourceTokenAddress.toLowerCase()
        );
        const targetTokenDetail = tokenDetails.find(
            (token) =>
                token.tokenAddress.toLowerCase() ===
                targetTokenAddress.toLowerCase()
        );

        // if source / target token details are not found, throw an error
        if (!sourceTokenDetail || !targetTokenDetail) {
            elizaLogger.error(
                traceId,
                `[getPrice] [${senpiUserId}] [ERROR] source / target token details not found`
            );
            throw new Error(
                `Failed to get token details from codex with error`
            );
        }
        if (!sourceTokenDetail?.priceUSD) {
            elizaLogger.error(
                traceId,
                `[getPrice] [${senpiUserId}] [ERROR] priceUSD not found for source token: ${sourceTokenDetail}`
            );
            throw new Error(
                `Failed to get token price in USD for token: ${sourceTokenAddress}`
            );
        }

        const sourceTokenPriceInUSD = new Decimal(sourceTokenDetail.priceUSD);
        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${sourceTokenSymbol}] Price USD: ${sourceTokenPriceInUSD}`
        );

        // check for the target token price in USD
        if (!targetTokenDetail?.priceUSD) {
            elizaLogger.error(
                traceId,
                `[getPrice] [${senpiUserId}] [ERROR] priceUSD not found for target token: ${targetTokenDetail}`
            );
            throw new Error(
                `Failed to get token price in USD for token: ${targetTokenAddress}`
            );
        }

        const targetTokenPriceInUSD = new Decimal(targetTokenDetail.priceUSD);
        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${targetTokenSymbol}] Price USD: ${targetTokenPriceInUSD}`
        );

        // convert the amount to ether
        const amountinEther = ethers.formatUnits(amount, sourceTokenDecimals);

        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${sourceTokenSymbol}] amount in ether: ${amountinEther}`
        );

        // calculate the amount of target token that can be bought with the amount using the source token price in USD
        const amountInTargetToken = new Decimal(amountinEther.toString())
            .mul(sourceTokenPriceInUSD.toString())
            .div(targetTokenPriceInUSD.toString())
            .toString();

        const amountInTargetTokenFixed = new Decimal(amountInTargetToken)
            .toFixed(Number(targetTokenDecimals))
            .replace(/\.?0+$/, ""); // Remove trailing zeros and decimal point if whole number

        elizaLogger.debug(
            traceId,
            `[getPrice] [${senpiUserId}] [${targetTokenSymbol}] amount: ${amountInTargetTokenFixed}`
        );

        // convert to wei
        return ethers
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
