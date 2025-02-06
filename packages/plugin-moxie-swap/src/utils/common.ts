import { elizaLogger } from "@elizaos/core";
import { ethers } from "ethers";
import { getERC20Balance } from "./erc20Balance";

export async function handleTransactionStatus(moxieUserId: string, provider: ethers.JsonRpcProvider, txHash: string): Promise<ethers.TransactionReceipt | null> {
    elizaLogger.debug(`[${moxieUserId}] [handleTransactionStatus] called with input details: [${txHash}]`)
    let txnReceipt:ethers.TransactionReceipt | null = undefined;
    try {
        txnReceipt = await provider.waitForTransaction(txHash, 1, 60000);
        if (!txnReceipt) {
            throw new Error("Transaction receipt timeout");
        }
    } catch (error) {
        elizaLogger.error(`[${moxieUserId}] [handleTransactionStatus] Error waiting for transaction receipt: ${error.message}`);
        throw new Error(`Transaction timed out or failed: ${error.message}`);
    }
    if (txnReceipt.status === 1) {
        elizaLogger.debug(`[${moxieUserId}] [handleTransactionStatus] transaction successful: ${txHash}`);
        return txnReceipt;
    } else {
        elizaLogger.error(`[${moxieUserId}] [handleTransactionStatus] transaction failed: ${txHash} with status: ${txnReceipt.status}`);
        return null;
    }
}

export function convert32BytesToAddress(hexString: string): string {
    // Remove 0x if present
    const clean = hexString.replace('0x', '');

    // Remove the first 24 characters (12 bytes of padding)
    const address = '0x' + clean.slice(24);

    return ethers.getAddress(address);
}

export function convertAddress(fromAddress: string): string {
    const strippedAddress = fromAddress.substring(2); // Remove '0x'
    const paddedAddress = '000000000000000000000000' + strippedAddress;
    const convertedAddress = '0x' + paddedAddress;
    return convertedAddress;
}

export function extractCreatorDetails(token: string): { username: string; userId: string } | null {
    const regex = /@\[([^|]+)\|([^\]]+)\]/;
    const match = token.match(regex);

    if (!match) {
        return {
            username: null,
            userId: null
        };
    }

    return {
        username: match[1],
        userId: match[2]
    };
}

export function extractTokenDetails(token: string): { tokenSymbol: string; tokenAddress: string } | null {
    const regex = /\$\[([^|]+)\|([^\]]+)\]/;
    const match = token.match(regex);

    if (!match) {
        return {
            tokenSymbol: null,
            tokenAddress: null
        };
    }

    return {
        tokenSymbol: match[1],
        tokenAddress: match[2]
    };
}

export async function checkMoxieBalance(
    requiredAmount: bigint,
    walletAddress: string,
    callback?: Function
): Promise<boolean> {
    const balance = await getERC20Balance(process.env.MOXIE_TOKEN_ADDRESS, walletAddress);
    const currentBalance = balance !== "" ? BigInt(balance) : 0n;

    if (currentBalance < requiredAmount) {
        await callback?.({
            text: `Insufficient MOXIE balance to complete this purchase.\nCurrent Balance: ${ethers.formatEther(currentBalance)} MOXIE\nRequired Amount: ${ethers.formatEther(requiredAmount)} MOXIE`,
            content: {
                error: "INSUFFICIENT_MOXIE_BALANCE",
                details: `Insufficient MOXIE balance to complete this purchase.`
            }
        });
        return true;
    }
    return false;
}