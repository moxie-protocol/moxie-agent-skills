import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { TRANSACTION_RECEIPT_TIMEOUT } from "../constants";
import { Context, FunctionResponse } from "../types/types";
import { APPLICATION_ERROR } from "../templates/callBackTemplate";

/**
 * Handles the status of a blockchain transaction by waiting for confirmation and checking the receipt
 * @param context The context of the transaction
 * @param provider The Ethereum JSON RPC provider used to interact with the blockchain
 * @param txHash The transaction hash to monitor
 * @returns The transaction receipt or a callback template if the transaction fails
 */
export async function handleTransactionStatus(
    context: Context,
    txHash: string
): Promise<FunctionResponse<string>> {
    elizaLogger.debug(
        `[${context.moxieUserId}] [handleTransactionStatus] called with input details: [${txHash}]`
    );
    let txnReceipt: ethers.TransactionReceipt | null = null;

    try {
        txnReceipt = await context.provider.waitForTransaction(
            txHash,
            1,
            TRANSACTION_RECEIPT_TIMEOUT
        );
        if (!txnReceipt) {
            elizaLogger.error(
                `[${context.moxieUserId}] [handleTransactionStatus] Transaction receipt timeout`
            );
            return {
                data: null,
                callBackTemplate: APPLICATION_ERROR(
                    "Transaction failed. Receipt not found"
                ),
            };
        }

        if (txnReceipt.status === 1) {
            elizaLogger.debug(
                `[${context.moxieUserId}] [handleTransactionStatus] transaction successful: ${txHash}`
            );
            return {
                data: txHash,
            };
        } else {
            elizaLogger.error(
                `[${context.moxieUserId}] [handleTransactionStatus] transaction failed: ${txHash} with status: ${txnReceipt.status}`
            );
            return {
                data: null,
                callBackTemplate: APPLICATION_ERROR("Transaction failed"),
            };
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        elizaLogger.error(
            `[${context.moxieUserId}] [handleTransactionStatus] Error waiting for transaction receipt: ${errorMessage}`
        );
        return {
            callBackTemplate: APPLICATION_ERROR(
                `Transaction failed. Error: ${errorMessage}`
            ),
        };
    }
}

export function convert32BytesToAddress(hexString: string): string {
    // Remove 0x if present
    const clean = hexString.replace("0x", "");

    // Remove the first 24 characters (12 bytes of padding)
    const address = "0x" + clean.slice(24);

    return ethers.getAddress(address);
}

export function convertAddress(fromAddress: string): string {
    const strippedAddress = fromAddress.substring(2); // Remove '0x'
    const paddedAddress = "000000000000000000000000" + strippedAddress;
    const convertedAddress = "0x" + paddedAddress;
    return convertedAddress;
}

export function extractCreatorDetails(
    token: string
): { username: string; userId: string } | null {
    const regex = /@\[([^|]+)\|([^\]]+)\]/;
    const match = token.match(regex);

    if (!match) {
        return {
            username: null,
            userId: null,
        };
    }

    return {
        username: match[1],
        userId: match[2],
    };
}

export function extractTokenDetails(
    token: string
): { tokenSymbol: string; tokenAddress: string } | null {
    const regex = /\$\[([^|]+)\|([^\]]+)\]/;
    const match = token.match(regex);

    if (!match) {
        return {
            tokenSymbol: null,
            tokenAddress: null,
        };
    }

    return {
        tokenSymbol: match[1],
        tokenAddress: match[2],
    };
}

// Override the debug method
elizaLogger.debug = function (traceId: string, ...strings: any[]) {
    // generate timestamp
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${traceId}]`, ...strings);
};

// Override the info method
elizaLogger.info = function (traceId: string, ...strings: any[]) {
    // generate timestamp
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${traceId}]`, ...strings);
};

// Override the error method
elizaLogger.error = function (traceId: string, ...strings: any[]) {
    // generate timestamp
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${traceId}]`, ...strings);
};
