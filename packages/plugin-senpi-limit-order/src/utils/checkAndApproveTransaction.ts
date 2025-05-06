import { elizaLogger, HandlerCallback } from "@senpi-ai/core";
import { ethers } from "ethers";
import { encodeFunctionData } from "viem";
import {
    approvalTransactionSubmitted,
    approvalTransactionConfirmed,
    approvalTransactionFailed,
    approvalTransactionTimedOut,
} from "./callbackTemplates";
import {
    SenpiWalletClient,
    SenpiWalletSendTransactionInputType,
} from "@senpi-ai/senpi-agent-lib";
import { TRANSACTION_RECEIPT_TIMEOUT } from "../constants";

const MAX_UINT256 = BigInt(
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"
); // Maximum uint256 value for unlimited approval

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
    {
        constant: true,
        inputs: [
            {
                name: "_owner",
                type: "address",
            },
            {
                name: "_spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                name: "",
                type: "uint256",
            },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
    },
];

/**
 * Checks the allowance of a token and approves spending if necessary
 * @param senpiUserId The ID of the Moxie user making the purchase
 * @param walletAddress The address of the wallet to check allowance for
 * @param tokenAddress The address of the token to check allowance for
 * @param spenderAddress The address of the spender to check allowance for
 * @param amountInWEI The amount of tokens to check allowance for
 * @param provider The provider to use for the transaction
 * @param walletClient The Moxie wallet client to use for the transaction
 * @param callback The callback to use for the transaction
 */
export async function checkAllowanceAndApproveSpendRequest(
    traceId: string,
    senpiUserId: string,
    walletAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amountInWEI: bigint,
    provider: ethers.providers.Provider,
    walletClient: SenpiWalletClient,
    callback: HandlerCallback
) {
    // Add input validation
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
        throw new Error("Invalid wallet address");
    }
    if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
        throw new Error("Invalid token address");
    }
    if (!spenderAddress || !ethers.utils.isAddress(spenderAddress)) {
        throw new Error("Invalid spender address");
    }
    if (amountInWEI <= 0) {
        throw new Error("Invalid amount");
    }

    elizaLogger.debug(
        traceId,
        `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] called, walletAddress: ${walletAddress}, tokenAddress: ${tokenAddress}, spenderAddress: ${spenderAddress}, tokenAmount: ${amountInWEI}`
    );
    try {
        // First, create contract instance to check allowance
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
        );

        // Check current allowance
        const currentAllowance: bigint = await tokenContract.allowance(
            walletAddress,
            spenderAddress
        );
        elizaLogger.debug(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] current ${spenderAddress} allowance for wallet address: ${walletAddress}, ${currentAllowance}`
        );

        // If allowance is already sufficient, return early
        if (currentAllowance && currentAllowance >= amountInWEI) {
            elizaLogger.debug(
                traceId,
                `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance already exists. hence no approval is required`
            );
            return true;
        }

        elizaLogger.debug(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance not exists. hence proceeeding with approval is required`
        );

        // Get gas estimate for approval transaction
        const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            args: [spenderAddress, MAX_UINT256.toString()],
            functionName: "approve",
        });

        // If we need to approve, create the approve transaction
        const feeData = await provider.getFeeData();
        elizaLogger.debug(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] feeData: ${JSON.stringify(feeData)}`
        );

        // Add 20% buffer to gas fees
        const maxFeePerGas =
            (feeData.maxFeePerGas!.toBigInt() * BigInt(120)) / BigInt(100);
        const maxPriorityFeePerGas =
            (feeData.maxPriorityFeePerGas!.toBigInt() * BigInt(120)) /
            BigInt(100);

        const approveRequestInput: SenpiWalletSendTransactionInputType = {
            address: walletAddress,
            chainType: "ethereum",
            caip2: `eip155:${process.env.CHAIN_ID || "8453"}`,
            transaction: {
                from: walletAddress as `0x${string}`,
                to: tokenAddress as `0x${string}`,
                data: approveData,
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                chainId: Number(process.env.CHAIN_ID || "8453"),
            },
        };

        elizaLogger.debug(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] approve request: ${JSON.stringify(
                approveRequestInput,
                (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
            )}`
        );
        let approveResponse;
        const MAX_RETRIES = 3;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            try {
                approveResponse = await walletClient.sendTransaction(
                    process.env.CHAIN_ID || "8453",
                    {
                        fromAddress: walletAddress,
                        toAddress: tokenAddress,
                        data: approveData,
                        maxFeePerGas: Number(maxFeePerGas),
                        maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                    }
                );
                break; // Exit the loop if successful
            } catch (error) {
                retryCount++;
                elizaLogger.warn(
                    traceId,
                    `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] Transaction attempt ${retryCount} failed: ${error.message}`
                );
                if (retryCount >= MAX_RETRIES) {
                    elizaLogger.error(
                        traceId,
                        `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] Failed to send transaction after ${MAX_RETRIES} attempts`
                    );
                    await callback(
                        approvalTransactionFailed(approveResponse.hash)
                    );
                    throw error; // Rethrow the error after all retries are exhausted
                }
                // Wait before retrying (exponential backoff)
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, retryCount))
                );
            }
        }
        elizaLogger.debug(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] approval txn_hash: ${JSON.stringify(approveResponse)}`
        );
        const approvalTxHash = approveResponse.hash;
        await callback(approvalTransactionSubmitted(approvalTxHash));

        // check if the approve txn is success.
        if (approveResponse && approvalTxHash) {
            let receipt: ethers.providers.TransactionReceipt;
            const MAX_RECEIPT_RETRIES = 3;
            let receiptRetryCount = 0;

            while (receiptRetryCount < MAX_RECEIPT_RETRIES) {
                try {
                    receipt = await provider.waitForTransaction(
                        approvalTxHash,
                        1,
                        TRANSACTION_RECEIPT_TIMEOUT
                    );
                    break; // Exit the loop if successful
                } catch (error) {
                    receiptRetryCount++;
                    elizaLogger.warn(
                        traceId,
                        `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] Transaction receipt attempt ${receiptRetryCount} failed: ${error.message}`
                    );
                    if (receiptRetryCount >= MAX_RECEIPT_RETRIES) {
                        elizaLogger.error(
                            traceId,
                            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] Failed to get transaction receipt after ${MAX_RECEIPT_RETRIES} attempts`
                        );
                        await callback(
                            approvalTransactionTimedOut(approvalTxHash)
                        );
                        throw error; // Rethrow the error after all retries are exhausted
                    }
                    // Wait before retrying (exponential backoff)
                    await new Promise((resolve) =>
                        setTimeout(
                            resolve,
                            1000 * Math.pow(2, receiptRetryCount)
                        )
                    );
                }
            }
            elizaLogger.debug(
                traceId,
                `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] approval tx receipt: ${JSON.stringify(receipt)}`
            );
            if (receipt.status === 1) {
                elizaLogger.debug(
                    traceId,
                    `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [SUCCESS] Approval transaction successful: ${approvalTxHash}`
                );
                await callback(approvalTransactionConfirmed(approvalTxHash));
            } else {
                elizaLogger.error(
                    traceId,
                    `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] Approval transaction failed: ${approvalTxHash}`
                );
                await callback(approvalTransactionFailed(approvalTxHash));
                throw new Error(`Approval transaction failed`);
            }
        } else {
            elizaLogger.error(
                traceId,
                `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] No transaction hash returned for approval`
            );
            throw new Error(`Approval transaction not initiated`);
        }
        return true;
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[${senpiUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] error in checkAllowanceAndApproveSpendRequest, ${JSON.stringify(error)}`
        );
        throw error;
    }
}
