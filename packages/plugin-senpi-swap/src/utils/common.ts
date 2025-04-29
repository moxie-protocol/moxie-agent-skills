import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { TRANSACTION_RECEIPT_TIMEOUT } from "./constants";
import { insufficientMoxieBalanceTemplate } from "./callbackTemplates";
import { getERC20Balance } from "./erc20";

/**
 * Handles the status of a blockchain transaction by waiting for confirmation and checking the receipt
 * @param moxieUserId The ID of the Moxie user initiating the transaction
 * @param provider The Ethereum JSON RPC provider used to interact with the blockchain
 * @param txHash The transaction hash to monitor
 * @returns Promise that resolves to the transaction receipt if successful, or null if failed
 * @throws Error if transaction times out or fails
 */
export async function handleTransactionStatus(
    traceId: string,
    moxieUserId: string,
    provider: ethers.JsonRpcProvider,
    txHash: string
): Promise<ethers.TransactionReceipt | null> {
    elizaLogger.debug(
        traceId,
        `[${moxieUserId}] [handleTransactionStatus] called with input details: [${txHash}]`
    );
    let txnReceipt: ethers.TransactionReceipt | null = null;

    try {
        txnReceipt = await provider.waitForTransaction(
            txHash,
            1,
            TRANSACTION_RECEIPT_TIMEOUT
        );
        if (!txnReceipt) {
            elizaLogger.error(
                traceId,
                `[${moxieUserId}] [handleTransactionStatus] Transaction receipt timeout`
            );
            return null;
        }

        if (txnReceipt.status === 1) {
            elizaLogger.debug(
                traceId,
                `[${moxieUserId}] [handleTransactionStatus] transaction successful: ${txHash}`
            );
            return txnReceipt;
        } else {
            elizaLogger.error(
                traceId,
                `[${moxieUserId}] [handleTransactionStatus] transaction failed: ${txHash} with status: ${txnReceipt.status}`
            );
            return null;
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        elizaLogger.error(
            traceId,
            `[${moxieUserId}] [handleTransactionStatus] Error waiting for transaction receipt: ${errorMessage}`
        );
        return null;
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

// /**
//  * Checks if the Moxie balance is sufficient for the required amount
//  * @param requiredAmount The amount required to check the balance against
//  * @param walletAddress The address of the wallet to check the balance of
//  * @param callback The callback to call if the balance is insufficient
//  * @returns Promise that resolves to true if the balance is insufficient, false otherwise
//  */
// export async function checkMoxieBalance(
//     requiredAmount: bigint,
//     walletAddress: string,
//     callback?: Function
// ): Promise<boolean> {
//     if (!process.env.MOXIE_TOKEN_ADDRESS) {
//         throw new Error('MOXIE_TOKEN_ADDRESS environment variable is not set');
//     }
//     const balance = await getERC20Balance(traceId, process.env.MOXIE_TOKEN_ADDRESS, walletAddress);
//     const currentBalance = balance !== "" ? BigInt(balance) : 0n;

//     if (currentBalance < requiredAmount) {
//         await callback?.(insufficientMoxieBalanceTemplate(currentBalance, requiredAmount));
//         return true;
//     }
//     return false;
// }
