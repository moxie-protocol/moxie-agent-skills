import { ethers } from "ethers"
import { MOXIE_TOKEN_DECIMALS } from "../constants";


export const insufficientEthBalanceTemplate = {
    text: `\nInsufficient ETH balance to complete this transaction. Please add more ETH to your wallet to cover gas fees.`,
};

export const swapOperationFailedTemplate = (error: Error) => ({
    text: `\nAn error occurred while performing the swap operation. Please try again.`,
    content: {
        error: "SWAP_OPERATION_FAILED",
        details: `An error occurred while performing the swap operation: ${error.message}.`
    }
});

export const insufficientMoxieBalanceTemplate = (currentBalance: bigint, requiredAmount: bigint) => ({
    text: `\nInsufficient MOXIE balance to complete this purchase.\nCurrent MOXIE: ${ethers.utils.formatEther(currentBalance)} MOXIE\nRequired MOXIE: ${ethers.utils.formatEther(requiredAmount)} MOXIE\n\nPlease specify if you would like to proceed with other token?`,
});

export const initiatePurchaseTemplate = (buyTokenCreatorUsername: string, moxieInWEI: bigint) => ({
    text: `\nInitiating purchase of ${buyTokenCreatorUsername} creator coins for ${ethers.utils.formatUnits(moxieInWEI.toString(), MOXIE_TOKEN_DECIMALS)} MOXIE.`,
});

export const swapInProgressTemplate = (sellTokenSymbol: string, buyTokenSymbol: string, txHash: string) => ({
    text: `\n${sellTokenSymbol} to ${buyTokenSymbol} conversion is in progress.\nView transaction status on [BaseScan](https://basescan.org/tx/${txHash})`,
    content: {
        url: `https://basescan.org/tx/${txHash}`,
    }
});

export const swapCompletedTemplate = (sellTokenSymbol: string, buyTokenSymbol: string, buyAmountInWEI: bigint, buyTokenDecimals: number) => ({
    text: `\n${sellTokenSymbol} to ${buyTokenSymbol} conversion completed successfully. ${buyAmountInWEI && buyAmountInWEI > 0n ? `\n${ethers.utils.formatUnits(buyAmountInWEI.toString(), buyTokenDecimals)} ${buyTokenSymbol} received.` : ''}`,
});

export const insufficientAllowanceTemplate = (sellTokenSymbol: string, buyTokenSymbol: string, allowance: bigint, requiredAllowance: bigint) => ({
    text: `\nInsufficient ${sellTokenSymbol} allowance to complete this purchase.\nCurrent allowance: ${ethers.utils.formatUnits(allowance.toString(), MOXIE_TOKEN_DECIMALS)} ${sellTokenSymbol}\nRequired allowance: ${ethers.utils.formatUnits(requiredAllowance.toString(), MOXIE_TOKEN_DECIMALS)} ${sellTokenSymbol}\n\nPlease approve spending of ${sellTokenSymbol} to complete this purchase.`,
});

export const swapFailedTemplate = (sellTokenSymbol: string, buyTokenSymbol: string, error: Error) => ({
    text: `\nFailed to swap ${sellTokenSymbol} to ${buyTokenSymbol} tokens. ${JSON.stringify(error)}`,
    content: {
        error: `${sellTokenSymbol}_TO_${buyTokenSymbol}_SWAP_FAILED`,
        details: `Failed to swap ${sellTokenSymbol} to ${buyTokenSymbol} tokens.`,
    }
});

export const insufficientBalanceTemplate = (sellTokenSymbol: string, buyTokenSymbol: string, balance: bigint, requiredBalance: bigint, decimals: number) => ({
    text: `\nInsufficient ${sellTokenSymbol} balance to complete this purchase.\nCurrent balance: ${ethers.utils.formatUnits(balance.toString(), decimals)} ${sellTokenSymbol}\nRequired balance: ${ethers.utils.formatUnits(requiredBalance.toString(), decimals)} ${sellTokenSymbol}\n\nPlease add more ${sellTokenSymbol} to your wallet to complete this purchase.`,
});

export const creatorCoinTransactionSubmittedTemplate = (swapTxnHash: string) => ({
    text: `\nView transaction status on [BaseScan](https://basescan.org/tx/${swapTxnHash})`,
    content: {
        url: `https://basescan.org/tx/${swapTxnHash}`,
    }
});

export const transactionFailedTemplate = (error: Error) => ({
    text: `\nTransaction failed: ${error.message}. Please try again or contact support if the issue persists.`,
});

export const indicativePriceInMOXIETemplate = (moxieInWEI: bigint, sellQuantity: bigint, value_type: string) => ({
    text: `\nIndicative price: ${sellQuantity} ${value_type} = ${ethers.utils.formatUnits(moxieInWEI, MOXIE_TOKEN_DECIMALS)} MOXIE`,
    content: {
        indicativePrice: moxieInWEI.toString()
    }
});

export const MOXIEToCreatorCoinPriceTemplate = (moxieInWEI: bigint, sellQuantity: bigint, value_type: string) => ({
    text: `\nIndicative price: ${sellQuantity} ${value_type} = ${ethers.utils.formatUnits(moxieInWEI, MOXIE_TOKEN_DECIMALS)} MOXIE`,
    content: {
        indicativePrice: moxieInWEI.toString()
    }
});

export const transactionConfirmedTemplate = (swapTxnHash: string) => ({
    text: `\nTransaction confirmed: View on BaseScan: https://basescan.org/tx/${swapTxnHash}.`,
    content: {
        url: `https://basescan.org/tx/${swapTxnHash}`,
    }
});

export const agentWalletNotFound = {
    text: `\nPlease make sure to set up your agent wallet first and try again.`,
};

export const delegateAccessNotFound = {
    text: `\nPlease make sure to set up your agent wallet first and try again.`,
};

export const approvalTransactionSubmitted = (approvalTxHash: string) => ({
    text: `\nApproval transaction submitted. Awaiting confirmation.\nView on [BaseScan](https://basescan.org/tx/${approvalTxHash})`,
    content: {
        url: `https://basescan.org/tx/${approvalTxHash}`,
    }
});

export const approvalTransactionConfirmed = (approvalTxHash: string) => ({
    text: `\nApproval transaction is confirmed!`,
    content: {
        url: `https://basescan.org/tx/${approvalTxHash}`,
    }
});

export const approvalTransactionFailed = (approvalTxHash: string) => ({
    text: `\nApproval transaction is failed!`,
});

export const moxieWalletClientNotFound = {
    text: `\nUnable to access moxie wallet details. Please ensure your moxie wallet is properly setup and try again.`,
};