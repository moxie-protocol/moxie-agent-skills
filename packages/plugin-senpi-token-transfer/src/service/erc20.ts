import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { ETH_ADDRESS } from "../constants";
import { convert32BytesToAddress } from "../utils/common";
import { Context } from "../types/types";
const TRANSFER_TOPIC0 =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/**
 * Fetches the balance of an ERC20 token for a given wallet address
 * @param tokenAddress - The address of the ERC20 token
 * @param walletAddress - The address of the wallet to fetch the balance for
 * @returns The balance of the ERC20 token in WEI as a string
 * @throws Error if the token address is invalid or the balance cannot be fetched
 */
export async function getERC20Balance(
    tokenAddress: string,
    walletAddress: string
): Promise<string> {
    const abi = [
        {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
        },
    ];

    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balanceWEI = await contract.balanceOf(walletAddress);
        return balanceWEI.toString();
    } catch (error) {
        elizaLogger.error(
            `Error fetching token balance for address ${walletAddress} and token ${tokenAddress}:`,
            error
        );
        throw new Error(`Failed to fetch token balance: ${error.message}`);
    }
}

export async function getNativeTokenBalance(walletAddress: string) {
    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const balanceWEI = await provider.getBalance(walletAddress);
        return balanceWEI.toString();
    } catch (error) {
        elizaLogger.error("Error fetching native token balance:", error);
        throw error;
    }
}
/**
 * Decodes a token transfer event from a transaction receipt
 * @param senpiUserId - The ID of the Senpi user
 * @param txReceipt - The transaction receipt containing the token transfer event
 * @returns An object containing the amount, from address, and to address of the token transfer, or null if no transfer event is found
 */
export async function decodeTokenTransfer(
    senpiUserId: string,
    txReceipt: ethers.TransactionReceipt,
    buyTokenAddress: string,
    agentWalletAddress: string
): Promise<{ amount: string; from: string; to: string } | null> {
    try {
        elizaLogger.debug(
            `[decodeTokenTransfer] [${senpiUserId}] called with input details: [${JSON.stringify(txReceipt)}]`
        );
        // Find the log event for Senpi token transfer
        if (buyTokenAddress !== ETH_ADDRESS) {
            elizaLogger.debug(
                `[decodeTokenTransfer] [${senpiUserId}] fetching token log for transaction for ERC20: ${txReceipt.hash}`
            );
            const tokenLog = txReceipt.logs.find(
                (log) =>
                    log.address.toLowerCase() ===
                        buyTokenAddress.toLowerCase() &&
                    log.topics[0] === TRANSFER_TOPIC0 &&
                    convert32BytesToAddress(log.topics[2]).toLowerCase() ===
                        agentWalletAddress.toLowerCase()
            );
            if (!tokenLog) {
                elizaLogger.error(
                    `[decodeTokenTransfer] [${senpiUserId}] No token transfer event found in transaction receipt`
                );
                return null;
            }
            // Decode the amount from the data field
            const amount = ethers.toBigInt(tokenLog.data);
            return {
                amount: amount.toString(),
                from: convert32BytesToAddress(tokenLog.topics[1]),
                to: convert32BytesToAddress(tokenLog.topics[2]),
            };
        }
    } catch (error) {
        elizaLogger.error(
            `[decodeTokenTransfer] [${senpiUserId}] Error decoding token transfer: ${JSON.stringify(error)}`
        );
        return null;
    }
}

/**
 * Fetches the number of decimals for an ERC20 token
 * @param context - The context of the transaction
 * @param tokenAddress - The address of the ERC20 token
 * @returns The number of decimals for the token
 * @throws Error if the token address is invalid or the decimals cannot be fetched
 */
export async function getERC20Decimals(context: Context, tokenAddress: string) {
    const abi = [
        {
            constant: true,
            inputs: [],
            name: "decimals",
            outputs: [{ name: "decimals", type: "uint8" }],
            payable: false,
            stateMutability: "view",
            type: "function",
        },
    ];

    try {
        const contract = new ethers.Contract(
            tokenAddress,
            abi,
            context.provider
        );
        const decimals = await contract.decimals();
        return decimals;
    } catch (error) {
        elizaLogger.error(
            context.traceId,
            `[${context.senpiUserId}] [getERC20Decimals] Error fetching token decimals: ${JSON.stringify(error)}`
        );
        throw error;
    }
}
