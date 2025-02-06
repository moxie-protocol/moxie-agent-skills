import { elizaLogger, HandlerCallback } from "@elizaos/core";
import { EthereumSendTransactionInputType,  EthereumSendTransactionResponseType,  PrivyClient, } from "@privy-io/server-auth";
import { ethers, parseEther } from "ethers";
import { decodeEventLog, decodeFunctionData, encodeFunctionData } from "viem";
import { checkAllowanceAndApproveSpendRequest } from "./checkAndApproveTransaction";
import { buyShares, createBuyRequestInput, createSwapRequestInput, decodeBuySharesEvent } from "./moxieBondingCurve";
import { handleTransactionStatus } from "./common";
import { SUPPORTED_TOKEN_ADDRESSES } from "../templates/creatorCoinSwapTemplate";

export const subjectSharePurchasedTopic0 = "0x96c1b5a0ee3c1932c831b8c6a559c93b48a3109915784a05ff44a07cc09c3931"
export const privy = new PrivyClient(process.env.PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];



/**
 * Executes a swap action to purchase creator coins using Moxie tokens
 * @param moxieUserId The user ID of the user performing the swap
 * @param provider The Ethereum provider
 * @param embeddedWallet The wallet address of the user performing the swap
 * @param creatorSubjectAddress The subject address of the creator whose coins are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @param callback Callback function to provide status updates during the swap process
 * @returns Promise that resolves when the swap is complete
 */
export async function executeBuyAction(moxieUserId: string, provider: ethers.JsonRpcProvider, embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint, callback: HandlerCallback) {

    elizaLogger.debug(`[creatorCoinSwap] [executeBuyAction] [${moxieUserId}] started, embeddedWallet: ${embeddedWallet}, creatorSubjectAddress: ${creatorSubjectAddress}, amountInWEI: ${amountInWEI}`)

    // Add input validation
    if (!moxieUserId || !embeddedWallet || !creatorSubjectAddress || !amountInWEI) {
        throw new Error('Missing required parameters');
    }

    try {
        // Check allowance and approve spending
        await checkAllowanceAndApproveSpendRequest(
            moxieUserId,
            embeddedWallet,
            process.env.MOXIE_TOKEN_ADDRESS,
            process.env.BONDING_CURVE_ADDRESS,
            amountInWEI,
            provider,
            privy,
            callback
        )

        // Buy Fan token request
        let swapResponse: any;
        try {
            swapResponse = await buyShares(moxieUserId, embeddedWallet, creatorSubjectAddress, amountInWEI);
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] buyShares response: ${JSON.stringify(swapResponse)}`)
        } catch (error) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] Failed to execute buyShares: ${error.message}`);

            // Handle specific error cases
            if (error.message?.includes('insufficient funds')) {
                await callback?.({
                    text: `Insufficient ETH balance to complete this transaction. Please add more ETH to your wallet to cover gas fees.`,
                });
                return {
                    success: false,
                    error: 'INSUFFICIENT_FUNDS'
                };
            }

            await callback?.({
                text: `An error occurred while performing the swap operation: ${error.message}`,
            });
            return {
                success: false,
                error: 'SWAP_FAILED'
            };
        }
        // @ts-ignore
        const swapTxnHash = swapResponse.data.hash;
        if (!swapTxnHash) {
            throw new Error('No transaction hash returned from swap');
        }

        await callback?.({
            text: `Your transaction has been submitted and is being processed. You can track its progress at https://basescan.org/tx/${swapTxnHash}`,
            content: {
                url: `https://basescan.org/tx/${swapTxnHash}`,
            }
        });

        // Check transaction status
        let swapReceipt: ethers.TransactionReceipt | null;
        try {
            swapReceipt = await handleTransactionStatus(moxieUserId, provider, swapTxnHash);
            if (!swapReceipt) {
                throw new Error('Transaction receipt not found');
            }
        } catch (error) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] Failed to handle transaction status: ${error.message}`);
            await callback?.({
                text: `Transaction failed: ${error.message}. Please try again or contact support if the issue persists.`,
            });
            return {
                success: false,
                error: 'TRANSACTION_CONFIRMATION_FAILED'
            };
        }

        await callback?.({
            text: `Your transaction has been confirmed successfully. View details on BaseScan: https://basescan.org/tx/${swapTxnHash}`,
            content: {
                url: `https://basescan.org/tx/${swapTxnHash}`,
            }
        });

        // Decode event and return results
        const {creatorCoinsBought, moxieSold} = decodeBuySharesEvent(swapReceipt, moxieUserId);

        await callback?.({
            text: `Transaction Complete: Successfully acquired ${creatorCoinsBought} creator coins.`
        });

        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] swap response: ${JSON.stringify({swapTxnHash, creatorCoinsBought, moxieSold})}`);

        return {
            success: true,
            hash: swapTxnHash,
            creatorCoinsBought,
            moxieSold
        };

    } catch(error) {
        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] Unhandled error: ${error.message}`);
        throw error;
    }
}
