import { elizaLogger } from '@elizaos/core';
import { ethers, parseEther } from 'ethers';

const ABI = [
    {
        "inputs": [
          {
            "internalType": "address",
            "name": "_subject",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_subjectTokenAmount",
            "type": "uint256"
          }
        ],
        "name": "calculateTokensForBuy",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "moxieAmount_",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "protocolFee_",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "subjectFee_",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
];

/**
 * Calculates the amount of tokens that will be received for a given buy amount
 * @param moxieUserId The ID of the Moxie user making the purchase
 * @param subjectAddress The address of the subject token being purchased
 * @param amount The amount of tokens to buy
 * @returns The amount of tokens that will be received
 */
export async function calculateTokensBuy(
    moxieUserId: string,
    subjectAddress: string,
    amount: bigint
): Promise<bigint> {
    elizaLogger.debug(`[calculateTokensBuy] [${moxieUserId}] called with input details: [${subjectAddress}] [${amount}]`)
    const BASE_RPC_URL: string = process.env.BASE_RPC_URL
    if (!BASE_RPC_URL) {
        throw new Error("missing BASE_RPC_URL")
    }
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(
        process.env.BONDING_CURVE_ADDRESS,
        ABI,
        provider
    );

    try {
        const tokens = await contract.calculateTokensForBuy(
        subjectAddress,
        amount
        );
        if (!tokens || typeof tokens[0] !== 'bigint') {
            throw new Error("Invalid token calculation result");
        }
        return tokens[0];
    } catch (error) {
        elizaLogger.error(`[calculateTokensBuy] [${moxieUserId}] Error calculating tokens: ${JSON.stringify(error)}`)
        throw error;
    }
}