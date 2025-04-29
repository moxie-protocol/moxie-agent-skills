import { elizaLogger, HandlerCallback } from "@senpi-ai/core";
import {
    MoxieWalletClient,
    MoxieWalletSendTransactionResponseType,
} from "@elizaos/moxie-lib";
import { ethers } from "ethers";
import { checkAllowanceAndApproveSpendRequest } from "./checkAndApproveTransaction";
import { buyShares, decodeBuySharesEvent } from "./moxieBondingCurve";
import { handleTransactionStatus } from "./common";
import { sellShares, decodeSellSharesEvent } from "./moxieBondingCurve";
import {
    insufficientEthBalanceTemplate,
    swapOperationFailedTemplate,
    transactionFailedTemplate,
    transactionConfirmedTemplate,
    creatorCoinTransactionSubmittedTemplate,
} from "./callbackTemplates";
import { getERC20Balance } from "./erc20";
import { MOXIE_TOKEN_DECIMALS } from "./constants";

/**
 * Executes a swap action to purchase creator coins using Moxie tokens
 * @param moxieUserId The user ID of the user performing the swap
 * @param provider The Ethereum provider
 * @param embeddedWallet The wallet address of the user performing the swap
 * @param creatorSubjectAddress The subject address of the creator whose coins are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @param callback Callback function to provide status updates during the swap process
 * @param walletClient The Moxie wallet client
 * @param buyTokenCreatorUsername The username of the creator whose coins are being purchased
 * @returns Promise that resolves when the swap is complete
 */
export async function executeBuyAction(
    traceId: string,
    moxieUserId: string,
    provider: ethers.JsonRpcProvider,
    embeddedWallet: string,
    creatorSubjectAddress: string,
    amountInWEI: bigint,
    callback: HandlerCallback,
    walletClient: MoxieWalletClient,
    buyTokenCreatorUsername: string
) {
    elizaLogger.debug(
        traceId,
        `[creatorCoinSwap] [executeBuyAction] [${moxieUserId}] started, embeddedWallet: ${embeddedWallet}, creatorSubjectAddress: ${creatorSubjectAddress}, amountInWEI: ${amountInWEI}, buyTokenCreatorUsername: ${buyTokenCreatorUsername}`
    );

    // Add input validation
    if (
        !moxieUserId ||
        !embeddedWallet ||
        !creatorSubjectAddress ||
        !amountInWEI
    ) {
        throw new Error("Missing required parameters");
    }
    const moxieTokenAddress = process.env.MOXIE_TOKEN_ADDRESS;
    if (!moxieTokenAddress) {
        throw new Error(
            "MOXIE_TOKEN_ADDRESS environment variable is not defined"
        );
    }
    const bondingCurveAddress = process.env.BONDING_CURVE_ADDRESS;
    if (!bondingCurveAddress) {
        throw new Error(
            "BONDING_CURVE_ADDRESS environment variable is not defined"
        );
    }

    try {
        // Check allowance and approve spending
        await checkAllowanceAndApproveSpendRequest(
            traceId,
            moxieUserId,
            embeddedWallet,
            moxieTokenAddress,
            bondingCurveAddress,
            amountInWEI,
            provider,
            walletClient,
            callback
        );

        // Buy Fan token request
        let swapResponse: MoxieWalletSendTransactionResponseType;
        try {
            swapResponse = await buyShares(
                traceId,
                moxieUserId,
                embeddedWallet,
                creatorSubjectAddress,
                amountInWEI,
                walletClient
            );
            elizaLogger.debug(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] buyShares response: ${JSON.stringify(swapResponse)}`
            );
        } catch (error) {
            elizaLogger.error(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] Failed to execute buyShares: ${error.message}`
            );

            // Handle specific error cases
            if (error.message?.includes("insufficient funds")) {
                await callback?.(insufficientEthBalanceTemplate);
                return {
                    success: false,
                    error: "INSUFFICIENT_FUNDS",
                };
            }

            await callback?.(swapOperationFailedTemplate(error));
            return {
                success: false,
                error: "SWAP_FAILED",
            };
        }
        const swapTxnHash = swapResponse.hash;
        if (!swapTxnHash) {
            throw new Error("No transaction hash returned from swap");
        }

        await callback?.(creatorCoinTransactionSubmittedTemplate(swapTxnHash));

        // Check transaction status
        let swapReceipt: ethers.TransactionReceipt | null;
        try {
            swapReceipt = await handleTransactionStatus(
                traceId,
                moxieUserId,
                provider,
                swapTxnHash
            );
            if (!swapReceipt) {
                throw new Error("Transaction receipt not found");
            }
        } catch (error) {
            elizaLogger.error(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] Failed to handle transaction status: ${error.message}`
            );
            await callback?.(transactionFailedTemplate(error));
            return {
                success: false,
                error: "TRANSACTION_CONFIRMATION_FAILED",
            };
        }

        // await callback?.(transactionConfirmedTemplate(swapTxnHash));

        // Decode event and return results
        const { creatorCoinsBought, moxieSold } = decodeBuySharesEvent(
            traceId,
            swapReceipt,
            moxieUserId
        );

        await callback?.({
            text: `\nTransaction Complete: Successfully acquired ${creatorCoinsBought} ${buyTokenCreatorUsername} creator coins.`,
        });

        elizaLogger.debug(
            traceId,
            `[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] swap response: ${JSON.stringify({ swapTxnHash, creatorCoinsBought, moxieSold })}`
        );

        return {
            success: true,
            hash: swapTxnHash,
            creatorCoinsBought,
            moxieSold,
        };
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[creatorCoinSwap] [${moxieUserId}] [executeBuyAction] [ERROR] Unhandled error: ${error.message}`
        );
        throw error;
    }
}

/**
 * Executes a swap action to sell creator coins for Moxie tokens
 * @param moxieUserId The user ID of the user performing the swap
 * @param provider The Ethereum provider
 * @param embeddedWallet The wallet address of the user performing the swap
 * @param creatorSubjectAddress The subject address of the creator whose coins are being sold
 * @param amountInWEI The amount of creator coins to sell in WEI
 * @param callback Callback function to provide status updates during the swap process
 * @param walletClient The Moxie wallet client
 * @returns Promise that resolves when the swap is complete
 */
export async function executeSellAction(
    traceId: string,
    moxieUserId: string,
    provider: ethers.JsonRpcProvider,
    embeddedWallet: string,
    creatorSubjectAddress: string,
    creatorSubjectTokenAddress: string,
    amountInWEI: bigint,
    callback: HandlerCallback,
    walletClient: MoxieWalletClient
) {
    elizaLogger.debug(
        traceId,
        `[creatorCoinSwap] [executeSellAction] [${moxieUserId}] started, embeddedWallet: ${embeddedWallet}, creatorSubjectAddress: ${creatorSubjectAddress}, creatorSubjectTokenAddress: ${creatorSubjectTokenAddress}, amountInWEI: ${amountInWEI}`
    );
    // Add input validation
    if (
        !moxieUserId ||
        !embeddedWallet ||
        !creatorSubjectAddress ||
        !creatorSubjectTokenAddress ||
        !amountInWEI
    ) {
        throw new Error("Missing required parameters");
    }
    if (!process.env.BONDING_CURVE_ADDRESS) {
        throw new Error(
            "BONDING_CURVE_ADDRESS environment variable is not defined"
        );
    }

    // check balance of creator subject token
    const availableTokenBalanceInWEI = await getERC20Balance(
        traceId,
        creatorSubjectTokenAddress,
        embeddedWallet
    );
    if (BigInt(availableTokenBalanceInWEI) < amountInWEI) {
        elizaLogger.debug(
            traceId,
            `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] [INSUFFICIENT_FUNDS] insufficient balance: ${availableTokenBalanceInWEI} < ${amountInWEI}`
        );
        await callback({
            text: `\nInsufficient balance to complete this transaction.
                \nAvailable Balance: ${ethers.formatEther(availableTokenBalanceInWEI)} tokens
                \nRequested Amount: ${ethers.formatEther(amountInWEI)} tokens
                \n\nShould I proceed with using all your available balance of ${ethers.formatUnits(availableTokenBalanceInWEI, MOXIE_TOKEN_DECIMALS)} to complete this transaction?`,
            content: {
                error: "INSUFFICIENT_FUNDS",
            },
        });
        return {
            success: false,
            error: "INSUFFICIENT_FUNDS",
        };
    }

    try {
        // Check allowance and approve spending
        await checkAllowanceAndApproveSpendRequest(
            traceId,
            moxieUserId,
            embeddedWallet,
            creatorSubjectTokenAddress,
            process.env.BONDING_CURVE_ADDRESS,
            amountInWEI,
            provider,
            walletClient,
            callback
        );

        // Sell Fan token request
        let swapResponse: MoxieWalletSendTransactionResponseType;
        try {
            swapResponse = await sellShares(
                traceId,
                moxieUserId,
                embeddedWallet,
                creatorSubjectAddress,
                amountInWEI,
                walletClient
            );
            elizaLogger.debug(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] sellShares response: ${JSON.stringify(swapResponse)}`
            );
        } catch (error) {
            elizaLogger.error(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] Failed to execute sellShares: ${error.message}`
            );

            // Handle specific error cases
            if (error.message?.includes("insufficient funds")) {
                await callback?.(insufficientEthBalanceTemplate);
                return createSwapError(
                    "INSUFFICIENT_FUNDS",
                    "Insufficient ETH balance for transaction"
                );
            }

            await callback?.(swapOperationFailedTemplate(error));
            return createSwapError(
                "SWAP_FAILED",
                "Failed to execute swap operation"
            );
        }

        const swapTxnHash = swapResponse.hash;
        if (!swapTxnHash) {
            throw new Error("No transaction hash returned from swap");
        }

        await callback?.({
            text: `\nYour transaction has been submitted and is being processed.\n View transaction status on [BaseScan](${`https://basescan.org/tx/${swapTxnHash}`})`,
        });

        // Check transaction status
        let swapReceipt: ethers.TransactionReceipt | null;
        try {
            swapReceipt = await handleTransactionStatus(
                traceId,
                moxieUserId,
                provider,
                swapTxnHash
            );
            if (!swapReceipt) {
                throw new Error("Transaction receipt not found");
            }
        } catch (error) {
            elizaLogger.error(
                traceId,
                `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] Failed to handle transaction status: ${error.message}`
            );
            return createSwapError(
                "TRANSACTION_CONFIRMATION_FAILED",
                `Transaction failed: ${error.message}. Please try again or contact support if the issue persists.`
            );
        }

        // Decode event and return results
        const { creatorCoinsSold, moxieReceived } = decodeSellSharesEvent(
            traceId,
            swapReceipt,
            moxieUserId
        );

        await callback?.({
            text: `\nTransaction Complete: Successfully sold ${creatorCoinsSold} creator coins and received ${moxieReceived} $MOXIE `,
        });

        elizaLogger.debug(
            traceId,
            `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] swap response: ${JSON.stringify({ swapTxnHash, creatorCoinsSold, moxieReceived })}`
        );

        return {
            success: true,
            hash: swapTxnHash,
            creatorCoinsSold,
            moxieReceived,
        };
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[creatorCoinSwap] [${moxieUserId}] [executeSellAction] [ERROR] Unhandled error: ${error.message}`
        );
        throw error;
    }
}

function createSwapError(
    type:
        | "INSUFFICIENT_FUNDS"
        | "SWAP_FAILED"
        | "TRANSACTION_CONFIRMATION_FAILED",
    message: string
) {
    return {
        success: false,
        error: type,
        message,
    };
}
