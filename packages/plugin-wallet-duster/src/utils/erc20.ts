import { elizaLogger } from "@moxie-protocol/core";
import { ethers } from "ethers";

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
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
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
