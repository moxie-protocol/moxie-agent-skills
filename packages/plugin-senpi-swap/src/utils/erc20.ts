import { elizaLogger } from "@senpi-ai/core";
import { ethers } from "ethers";
import { convert32BytesToAddress } from "./common";
import { ETH_ADDRESS } from "./constants";

const TRANSFER_TOPIC0 =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function getERC20Balance(
    traceId: string,
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
        const checksumAddress = ethers.getAddress(walletAddress);
        const contract = new ethers.Contract(tokenAddress, abi, provider);

        let retries = 3;
        let delay = 1000; // Start with 1 second delay

        while (retries > 0) {
            try {
                const balanceWEI = await contract.balanceOf(checksumAddress);
                elizaLogger.debug(
                    traceId,
                    `[getERC20Balance] [${tokenAddress}] [${walletAddress}] fetched balance: ${balanceWEI.toString()}`
                );
                return balanceWEI.toString();
            } catch (error) {
                retries--;
                if (retries === 0) throw error;

                // Wait with exponential backoff before retrying
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
            }
        }
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[getERC20Balance] [${tokenAddress}] [${walletAddress}] Error fetching token balance: ${JSON.stringify(error)}`
        );
        throw error;
    }
}

export async function getNativeTokenBalance(
    traceId: string,
    walletAddress: string
) {
    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const checksumAddress = ethers.getAddress(walletAddress);

        // Add retry logic with exponential backoff
        let retries = 3;
        let delay = 1000; // Start with 1 second delay

        while (retries > 0) {
            try {
                const balanceWEI = await provider.getBalance(checksumAddress);
                elizaLogger.debug(
                    traceId,
                    `[getNativeTokenBalance] [${walletAddress}] fetched balance: ${balanceWEI.toString()}`
                );
                return balanceWEI.toString();
            } catch (error) {
                retries--;
                if (retries === 0) throw error;

                // Wait with exponential backoff before retrying
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
            }
        }
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[getNativeTokenBalance] [${walletAddress}] Error fetching native token balance: ${JSON.stringify(error)}`
        );
        throw error;
    }
}
/**
 * Decodes a token transfer event from a transaction receipt
 * @param moxieUserId - The ID of the Moxie user
 * @param txReceipt - The transaction receipt containing the token transfer event
 * @returns An object containing the amount, from address, and to address of the token transfer, or null if no transfer event is found
 */
export async function decodeTokenTransfer(
    traceId: string,
    moxieUserId: string,
    txReceipt: ethers.TransactionReceipt,
    buyTokenAddress: string,
    agentWalletAddress: string
): Promise<{ amount: string; from: string; to: string } | null> {
    try {
        elizaLogger.debug(
            traceId,
            `[decodeTokenTransfer] [${moxieUserId}] called with input details: [${JSON.stringify(txReceipt)}]`
        );
        // Find the log event for Moxie token transfer
        if (buyTokenAddress !== ETH_ADDRESS) {
            elizaLogger.debug(
                traceId,
                `[decodeTokenTransfer] [${moxieUserId}] fetching token log for transaction for ERC20: ${txReceipt.hash}`
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
                    traceId,
                    `[decodeTokenTransfer] [${moxieUserId}] No token transfer event found in transaction receipt`
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
            traceId,
            `[decodeTokenTransfer] [${moxieUserId}] Error decoding token transfer: ${JSON.stringify(error)}`
        );
        return null;
    }
}

/**
 * Fetches the number of decimals for an ERC20 token
 * @param tokenAddress - The address of the ERC20 token
 * @returns The number of decimals for the token
 * @throws Error if the token address is invalid or the decimals cannot be fetched
 */
export async function getERC20Decimals(traceId: string, tokenAddress: string) {
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
        // Verify checksum address
        const checksumAddress = ethers.getAddress(tokenAddress);
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const contract = new ethers.Contract(checksumAddress, abi, provider);

        // Add retry logic with exponential backoff
        let retries = 3;
        let delay = 1000; // Start with 1 second delay

        while (retries > 0) {
            try {
                const decimals = await contract.decimals();
                elizaLogger.debug(
                    traceId,
                    `[getERC20Decimals] [${tokenAddress}] fetched decimals: ${decimals}`
                );
                return decimals;
            } catch (err) {
                retries--;
                if (retries === 0) throw err;

                // Wait with exponential backoff before retrying
                await new Promise((resolve) => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
            }
        }
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[getERC20Decimals] [${tokenAddress}] Error fetching token decimals: ${JSON.stringify(error)}`
        );
        throw error;
    }
}
