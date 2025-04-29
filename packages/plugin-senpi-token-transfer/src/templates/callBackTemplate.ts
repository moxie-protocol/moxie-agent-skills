
export const INVALID_TRANSACTION_STRUCTURE = (reason: string) => {
    return {
        text: "\nInvalid transaction structure. Please try again with a valid transaction request.",
        content: {
            error: "INVALID_CONTENT",
            details: reason,
            action: "TOKEN_TRANSFER"
        }
    }
}

export const APPLICATION_ERROR = (error: string) => {
    return {
        text: "\nAn error occurred while processing the transaction. Please try again.",
        content: {
            error: "APPLICATION_ERROR",
            details: error,
            action: "TOKEN_TRANSFER"
        }
    }
}

export const CREATOR_NOT_FOUND = (creatorId: string) => {
    return {
        text: `\nUnfortunately, the user you are querying has not launched a creator coin yet. Creator coins are required to analyze user data using the Senpi AI Agent. Please try again`,
    }
}

export const INSUFFICIENT_BALANCE = (tokenSymbol: string, currentBalance: string, requiredBalance: string) => {
    return {
        text: `\nInsufficient balance in your agent wallet to complete this transaction. \nCurrent balance: ${currentBalance} ${tokenSymbol}\nRequired balance: ${requiredBalance} ${tokenSymbol}. Please add more funds to your agent wallet and try again.`,
    }
}

export const TRANSACTION_SUCCESSFUL = (txnHash: string, transferAmount: string, token: string, recipient: string) => {
    return {
        text: `\nTransaction Complete! Successfully sent ${transferAmount} ${token} to ${recipient}.\nView on [BaseScan](https://basescan.org/tx/${txnHash})`,
        content: {
            action: "TOKEN_TRANSFERS"
        }
    }
}