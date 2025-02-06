import { elizaLogger } from "@elizaos/core";
import { ethers } from "ethers";

const TRANSFER_TOPIC0 = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

export async function getERC20Balance(tokenAddress: string, walletAddress: string) {
    const abi = [
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        }
    ];

    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balanceWEI = await contract.balanceOf(walletAddress);
        return balanceWEI.toString()
    } catch (error) {
        elizaLogger.error('Error fetching token balance:', error);
        throw error;
    }
}

export async function getNativeTokenBalance(walletAddress: string) {
    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const balanceWEI = await provider.getBalance(walletAddress);
        return balanceWEI.toString()
    } catch (error) {
        elizaLogger.error('Error fetching native token balance:', error);
        throw error;
    }
}

export async function decodeMoxieTokenTransfer(moxieUserId: string, txReceipt: ethers.TransactionReceipt): Promise<{amount: string, from: string, to: string} | null> {
    try {
        elizaLogger.debug(`[decodeMoxieTokenTransfer] [${moxieUserId}] called with input details: [${JSON.stringify(txReceipt)}]`)
        // Find the log event for Moxie token transfer
        const moxieTokenLog = txReceipt.logs.find(log =>
            log.address.toLowerCase() === process.env.MOXIE_TOKEN_ADDRESS?.toLowerCase() &&
            log.topics[0] === TRANSFER_TOPIC0
        );

        if (!moxieTokenLog) {
            elizaLogger.error(`[decodeMoxieTokenTransfer] [${moxieUserId}] No Moxie token transfer event found in transaction receipt`);
            return null
        }

        // Decode the amount from the data field
        const amount = ethers.toBigInt(moxieTokenLog.data);
        return {
            amount: amount.toString(),
            from: moxieTokenLog.topics[1],
            to: moxieTokenLog.topics[2]
        }

    } catch (error) {
        elizaLogger.error(`[decodeMoxieTokenTransfer] [${moxieUserId}] Error decoding Moxie token transfer: ${JSON.stringify(error)}`);
        return null
    }
}

/**
 * Fetches the number of decimals for an ERC20 token
 * @param tokenAddress - The address of the ERC20 token
 * @returns The number of decimals for the token
 * @throws Error if the token address is invalid or the decimals cannot be fetched
 */
export async function getERC20Decimals(tokenAddress: string) {
    const abi = [
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{"name": "decimals", "type": "uint8"}],
            "payable": false,
            "stateMutability": "view",
            "type": "function"
        }
    ];

    try {
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const decimals = await contract.decimals();
        return decimals;
    } catch (error) {
        elizaLogger.error(`[getERC20Decimals] [${tokenAddress}] Error fetching token decimals: ${JSON.stringify(error)}`);
        throw error;
    }
}
