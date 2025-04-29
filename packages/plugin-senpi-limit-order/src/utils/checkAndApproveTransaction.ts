import { elizaLogger, HandlerCallback } from "@senpi-ai/core";
// import { MoxieWalletClient, MoxieWalletSendTransactionInputType } from '@elizaos/moxie-lib';
import { ethers } from "ethers";
import { encodeFunctionData } from "viem";
import {
    approvalTransactionSubmitted,
    approvalTransactionConfirmed,
    approvalTransactionFailed,
} from "./callbackTemplates";
import {
    MoxieWalletClient,
    MoxieWalletSendTransactionInputType,
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
 * @param moxieUserId The ID of the Moxie user making the purchase
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
    moxieUserId: string,
    walletAddress: string,
    tokenAddress: string,
    spenderAddress: string,
    amountInWEI: bigint,
    provider: ethers.providers.Provider,
    walletClient: MoxieWalletClient,
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
        `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] called, walletAddress: ${walletAddress}, tokenAddress: ${tokenAddress}, spenderAddress: ${spenderAddress}, tokenAmount: ${amountInWEI}`
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
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] current ${spenderAddress} allowance for wallet address: ${walletAddress}, ${currentAllowance}`
        );

        // If allowance is already sufficient, return early
        if (currentAllowance && currentAllowance >= amountInWEI) {
            elizaLogger.debug(
                traceId,
                `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance already exists. hence no approval is required`
            );
            return true;
        }

        elizaLogger.debug(
            traceId,
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] Sufficient allowance not exists. hence proceeeding with approval is required`
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
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] feeData: ${JSON.stringify(feeData)}`
        );

        // Add 20% buffer to gas fees
        const maxFeePerGas =
            (feeData.maxFeePerGas!.toBigInt() * BigInt(120)) / BigInt(100);
        const maxPriorityFeePerGas =
            (feeData.maxPriorityFeePerGas!.toBigInt() * BigInt(120)) /
            BigInt(100);

        const approveRequestInput: MoxieWalletSendTransactionInputType = {
            address: walletAddress,
            chainType: "ethereum",
            caip2: "eip155:" + (process.env.CHAIN_ID || "8453"),
            transaction: {
                from: walletAddress,
                to: tokenAddress,
                data: approveData,
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                chainId: Number(process.env.CHAIN_ID || "8453"),
            },
        };

        elizaLogger.debug(
            traceId,
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approve request: ${JSON.stringify(
                approveRequestInput,
                (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
            )}`
        );
        const approveResponse = await walletClient.sendTransaction(
            process.env.CHAIN_ID || "8453",
            {
                fromAddress: walletAddress,
                toAddress: tokenAddress,
                data: approveData,
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
            }
        );
        elizaLogger.debug(
            traceId,
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approval txn_hash: ${JSON.stringify(approveResponse)}`
        );
        const approvalTxHash = approveResponse.hash;
        await callback(approvalTransactionSubmitted(approvalTxHash));

        // check if the approve txn is success.
        if (approveResponse && approvalTxHash) {
            let receipt: ethers.providers.TransactionReceipt;
            try {
                receipt = await provider.waitForTransaction(
                    approvalTxHash,
                    1,
                    TRANSACTION_RECEIPT_TIMEOUT
                );
            } catch (error) {
                if (error.message.includes("timeout")) {
                    throw new Error("Approval transaction timed out");
                }
                throw error;
            }
            elizaLogger.debug(
                traceId,
                `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] approval tx receipt: ${JSON.stringify(receipt)}`
            );
            if (receipt.status === 1) {
                elizaLogger.debug(
                    traceId,
                    `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] [SUCCESS] Approval transaction successful: ${approvalTxHash}`
                );
                await callback(approvalTransactionConfirmed(approvalTxHash));
            } else {
                elizaLogger.error(
                    traceId,
                    `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] Approval transaction failed: ${approvalTxHash}`
                );
                await callback(approvalTransactionFailed(approvalTxHash));
                throw new Error(`Approval transaction failed`);
            }
        } else {
            elizaLogger.error(
                traceId,
                `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] No transaction hash returned for approval`
            );
            throw new Error(`Approval transaction not initiated`);
        }
        return true;
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[${moxieUserId}] [checkAllowanceAndApproveSpendRequest] [ERROR] error in checkAllowanceAndApproveSpendRequest, ${JSON.stringify(error)}`
        );
        throw error;
    }
}
