import { elizaLogger } from "@moxie-protocol/core";
import { decodeEventLog, encodeFunctionData } from "viem";
import { ethers } from "ethers";
import { BONDING_CURVE_ABI, subjectSharePurchasedTopic0, subjectShareSoldTopic0 } from "./constants";
import { MoxieWalletClient, MoxieWalletSendTransactionInputType, MoxieWalletSendTransactionResponseType } from "@elizaos/moxie-lib";


type SubjectSharePurchasedEvent = {
    args: {
        _subject: `0x${string}`; // indexed address
        _sellToken: string;
        _sellAmount: bigint;
        _spender: string;
        _buyToken: string;
        _buyAmount: bigint;
        _beneficiary: string;
    }
};



type SubjectShareSoldEvent = {
    args: {
        _subject: `0x${string}`; // indexed address
        _sellToken: `0x${string}`; // indexed address
        _sellAmount: bigint;
        _spender: `0x${string}`;
        _buyToken: `0x${string}`;
        _buyAmount: bigint;
        _beneficiary: `0x${string}`; // indexed address
    }
};


/**
 * Buys shares of a creator's tokens using the bonding curve contract
 * @param embeddedWallet The wallet address of the buyer
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @returns Promise that resolves to the transaction response from Privy
 * @throws Error if the transaction fails or if wallet has insufficient funds
 */
export async function buyShares(traceId: string, moxieUserId: string, embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint, walletClient: MoxieWalletClient): Promise<MoxieWalletSendTransactionResponseType> {
    elizaLogger.debug(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] called with input details: [${embeddedWallet}] [${creatorSubjectAddress}] [${amountInWEI}]`)
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const feeData = await provider.getFeeData();
        elizaLogger.debug(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] feeData: ${JSON.stringify(feeData)}`)
        const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas! * BigInt(120)) / BigInt(100);
        const maxFeePerGas = (feeData.maxFeePerGas! * BigInt(120)) / BigInt(100);
        elizaLogger.debug(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] maxPriorityFeePerGas: ${maxPriorityFeePerGas} maxFeePerGas: ${maxFeePerGas}`)
        const swapRequestInput: MoxieWalletSendTransactionInputType = {
            address: embeddedWallet,
            chainType: "ethereum",
            caip2: "eip155:" + (process.env.CHAIN_ID || '8453'),
            transaction: {
                from: embeddedWallet,
                to: process.env.BONDING_CURVE_ADDRESS,
                data: encodeFunctionData({
                    abi: BONDING_CURVE_ABI,
                    args: [
                        creatorSubjectAddress,
                        amountInWEI,
                        0,
                        "0x0000000000000000000000000000000000000000",
                    ],
                    functionName: "buySharesV2",
                }),
                chainId: Number(process.env.CHAIN_ID || '8453'),
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
            }

        };
        elizaLogger.debug(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] swap request: ${JSON.stringify(swapRequestInput, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )}`)
        const swapResponse = await walletClient.sendTransaction(process.env.CHAIN_ID, {
            fromAddress: embeddedWallet,
            toAddress: process.env.BONDING_CURVE_ADDRESS,
            data: swapRequestInput.transaction.data,
            maxFeePerGas: Number(maxFeePerGas),
            maxPriorityFeePerGas: Number(maxPriorityFeePerGas)
        })
        elizaLogger.debug(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] swap response: ${JSON.stringify(swapResponse)}`)
        return swapResponse;
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Error: Execution reverted for an unknown reason')) {
                throw new Error("Transaction failed during execution. Please try again.");
            }
            if (error.message?.includes("insufficient funds")) {
                throw new Error("Wallet has insufficient funds to execute the transaction (transaction amount + fees)");
            }
            if (error.message?.includes("nonce too low")) {
                throw new Error("Transaction nonce error. Please try again.");
            }
            if (error.message?.includes("gas price too low")) {
                throw new Error("Gas price too low. Please try again with higher gas price.");
            }
        }
        elizaLogger.error(traceId,`[creatorCoinSwap] [buyShares] [${moxieUserId}] [ERROR] Error executing buyShares: ${JSON.stringify(error)}`);
        throw new Error("Failed to execute buy shares transaction. Please try again.");
    }
}

/**
 * Creates input parameters for a buy shares transaction
 * @param embeddedWallet The wallet address of the buyer
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @returns EthereumSendTransactionInputType object with transaction parameters
 */
export function createBuyRequestInput(embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint): MoxieWalletSendTransactionInputType {
    return {
        address: embeddedWallet,
        chainType: "ethereum",
        caip2: "eip155:" + (process.env.CHAIN_ID || '8453'),
        transaction: {
            from: embeddedWallet,
            to: process.env.BONDING_CURVE_ADDRESS,
            data: encodeFunctionData({
                abi: BONDING_CURVE_ABI,
                args: [
                    creatorSubjectAddress,
                    amountInWEI.toString(),
                    0,
                    "0x0000000000000000000000000000000000000000",
                ],
                functionName: "buySharesV2",
            }),
        }
    };
}

/**
 * Creates input parameters for a swap transaction
 * @param embeddedWallet The wallet address of the user performing the swap
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being swapped
 * @param amountInWEI The amount of tokens to swap in WEI
 * @returns EthereumSendTransactionInputType object with transaction parameters
 */
export function createSwapRequestInput(embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint): MoxieWalletSendTransactionInputType {
    return createBuyRequestInput(embeddedWallet, creatorSubjectAddress, amountInWEI);
}


/**
 * Extracts and decodes share transfer details from a transaction receipt
 * @param receipt The transaction receipt containing the transfer logs
 * @param moxieUserId The user ID of the Moxie user
 * @returns Object containing the amount of creator coins bought and Moxie tokens sold
 */
export function decodeBuySharesEvent(traceId: string, receipt: ethers.TransactionReceipt, moxieUserId: string): { creatorCoinsBought: string, moxieSold: string } {
    // Find the share purchase event log
    const shareTransferLog = receipt.logs.find(log => log.topics[0] === subjectSharePurchasedTopic0);
    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] shareTransferLog: ${JSON.stringify(shareTransferLog)}`);

    if (!shareTransferLog) {
        throw new Error(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] Share transfer event log not found`);
    }

    // Decode the event data
    const decodedData = decodeEventLog({
        abi: BONDING_CURVE_ABI,
        data: shareTransferLog.data as `0x${string}`,
        topics: shareTransferLog.topics as [`0x${string}`, ...`0x${string}`[]]
    }) as unknown as SubjectSharePurchasedEvent;

    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] decodedData: ${JSON.stringify(decodedData, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    )}`);

    // Add null check for args to prevent potential undefined access
    if (!decodedData.args) {
        throw new Error(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] Event args not found in decoded data`);
    }

    // Extract and format the transfer amounts
    const creatorCoinsBought = ethers.formatEther(decodedData.args._buyAmount);
    const moxieSold = ethers.formatEther(decodedData.args._sellAmount);

    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] creatorCoinsBought: ${creatorCoinsBought} moxieSold: ${moxieSold}`);

    return {
        creatorCoinsBought,
        moxieSold
    };
}

/**
 * Calculates the amount of tokens that will be received for a given buy amount
 * @param moxieUserId The ID of the Moxie user making the purchase
 * @param subjectAddress The address of the subject token being purchased
 * @param amount The amount of tokens to buy
 * @returns The amount of tokens that will be received
 */
export async function calculateTokensBuy(
    traceId: string,
    moxieUserId: string,
    subjectAddress: string,
    amount: bigint
): Promise<bigint> {
    elizaLogger.debug(traceId,`[calculateTokensBuy] [${moxieUserId}] Starting calculation`, {
        subjectAddress,
        amount: amount.toString()
    });

    const BASE_RPC_URL = process.env.BASE_RPC_URL;
    const BONDING_CURVE_ADDRESS = process.env.BONDING_CURVE_ADDRESS;

    if (!BASE_RPC_URL) {
        throw new Error("BASE_RPC_URL environment variable is not configured");
    }
    if (!BONDING_CURVE_ADDRESS) {
        throw new Error("BONDING_CURVE_ADDRESS environment variable is not configured");
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(
        BONDING_CURVE_ADDRESS,
        BONDING_CURVE_ABI,
        provider
    );

    try {
        const tokens = await contract.calculateTokensForBuy(
            subjectAddress,
            amount
        );

        if (!tokens || !Array.isArray(tokens) || typeof tokens[0] !== 'bigint') {
            throw new Error("Contract returned invalid token calculation result");
        }

        elizaLogger.debug(traceId,`[calculateTokensBuy] [${moxieUserId}] Calculation successful`, {
            tokensToReceive: tokens[0].toString()
        });

        return tokens[0];
    } catch (error) {
        elizaLogger.error(traceId,`[calculateTokensBuy] [${moxieUserId}] Calculation failed`, {
            error: error instanceof Error ? error.message : String(error),
            subjectAddress,
            amount: amount.toString()
        });

        if (error instanceof Error) {
            if (error.message.includes('revert')) {
                throw new Error("Contract calculation reverted. Please verify input parameters.");
            }
        }
        throw new Error("Failed to calculate tokens. Please try again.");
    }
}

/**
 * Calculates the amount of tokens that will be received for a given sell amount
 * @param moxieUserId The ID of the Moxie user making the purchase
 * @param subjectAddress The address of the subject token being purchased
 * @param amountInWEI The amount of tokens to sell in WEI
 * @returns The amount of tokens that will be received
 */
export async function calculateTokensSell(
    traceId: string,
    moxieUserId: string,
    subjectAddress: string,
    amountInWEI: bigint
): Promise<bigint> {
    elizaLogger.debug(traceId,`[calculateTokensSell] [${moxieUserId}] Starting calculation`, {
        subjectAddress,
        amount: amountInWEI.toString()
    });

    const BASE_RPC_URL = process.env.BASE_RPC_URL;
    const BONDING_CURVE_ADDRESS = process.env.BONDING_CURVE_ADDRESS;

    if (!BASE_RPC_URL) {
        throw new Error("BASE_RPC_URL environment variable is not configured");
    }
    if (!BONDING_CURVE_ADDRESS) {
        throw new Error("BONDING_CURVE_ADDRESS environment variable is not configured");
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const contract = new ethers.Contract(
        BONDING_CURVE_ADDRESS,
        BONDING_CURVE_ABI,
        provider
    );

    try {
        const tokens = await contract.calculateTokensForSell(
            subjectAddress,
            amountInWEI
        );

        if (!tokens || !Array.isArray(tokens) || typeof tokens[0] !== 'bigint') {
            throw new Error("Contract returned invalid token calculation result");
        }

        elizaLogger.debug(traceId,`[calculateTokensSell] [${moxieUserId}] Calculation successful`, {
            tokensToReceive: tokens[0].toString()
        });

        return tokens[0];
    } catch (error) {
        elizaLogger.error(traceId,`[calculateTokensSell] [${moxieUserId}] Calculation failed`, {
            error: error instanceof Error ? error.message : String(error),
            subjectAddress,
            amount: amountInWEI.toString()
        });

        if (error instanceof Error) {
            if (error.message.includes('revert')) {
                throw new Error("Contract calculation reverted. Please verify input parameters.");
            }
        }
        throw new Error("Failed to calculate tokens. Please try again.");
    }
}

/**
 * Sells shares of a creator's tokens using the bonding curve contract
 * @param moxieUserId The ID of the Moxie user selling the shares
 * @param embeddedWallet The wallet address of the seller
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being sold
 * @param amountInWEI The amount of creator tokens to sell in WEI
 * @returns Promise that resolves to the transaction response from Privy
 * @throws Error if the transaction fails
 */
export async function sellShares(traceId: string, moxieUserId: string, embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint, walletClient: MoxieWalletClient): Promise<MoxieWalletSendTransactionInputType> {
    elizaLogger.debug(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] called with input details: [${embeddedWallet}] [${creatorSubjectAddress}] [${amountInWEI}]`)
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        const feeData = await provider.getFeeData();
        elizaLogger.debug(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] feeData: ${JSON.stringify(feeData)}`)
        const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas! * BigInt(120)) / BigInt(100);
        const maxFeePerGas = (feeData.maxFeePerGas! * BigInt(120)) / BigInt(100);
        elizaLogger.debug(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] maxPriorityFeePerGas: ${maxPriorityFeePerGas} maxFeePerGas: ${maxFeePerGas}`)
        const swapRequestInput: MoxieWalletSendTransactionInputType = {
            address: embeddedWallet,
            chainType: "ethereum",
            caip2: "eip155:" + (process.env.CHAIN_ID || '8453'),
            transaction: {
                from: embeddedWallet,
                to: process.env.BONDING_CURVE_ADDRESS,
                data: encodeFunctionData({
                    abi: BONDING_CURVE_ABI,
                    args: [
                        creatorSubjectAddress,
                        amountInWEI,  // tokens in wei and not moxie
                        0,
                        "0x0000000000000000000000000000000000000000",
                    ],
                    functionName: "sellSharesV2",
                }),
                chainId: Number(process.env.CHAIN_ID || '8453'),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                maxFeePerGas: Number(maxFeePerGas),
            }
        };
        elizaLogger.debug(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] swap request: ${JSON.stringify(swapRequestInput, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )}`)
        const swapResponse = await walletClient.sendTransaction(process.env.CHAIN_ID || '8453', {
            fromAddress: embeddedWallet,
            toAddress: process.env.BONDING_CURVE_ADDRESS,
            data: swapRequestInput.transaction.data,
            maxFeePerGas: Number(maxFeePerGas),
            maxPriorityFeePerGas: Number(maxPriorityFeePerGas)
        })
        elizaLogger.debug(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] swap response: ${JSON.stringify(swapResponse)}`)
        return swapResponse;
    } catch (error) {
        elizaLogger.error(traceId,`[creatorCoinSwap] [sellShares] [${moxieUserId}] Error executing sellShares: ${JSON.stringify(error)}`);
        if (error instanceof Error) {
            if (error.message.includes('Error: Execution reverted for an unknown reason')) {
                throw new Error("Transaction failed during execution. Please try again.");
            }
            if (error.message?.includes("insufficient funds")) {
                throw new Error("Wallet has insufficient funds to execute the transaction (transaction amount + fees)");
            }
            if (error.message?.includes("nonce too low")) {
                throw new Error("Transaction nonce error. Please try again.");
            }
            if (error.message?.includes("gas price too low")) {
                throw new Error("Gas price too low. Please try again with higher gas price.");
            }
        }
        throw new Error("Failed to execute sell shares transaction. Please try again.");
    }
}

/**
 * Extracts and decodes share transfer details from a transaction receipt
 * @param receipt The transaction receipt containing the transfer logs
 * @param moxieUserId The user ID of the Moxie user
 * @returns Object containing the amount of creator coins bought and Moxie tokens sold
 */
export function decodeSellSharesEvent(traceId: string, receipt: ethers.TransactionReceipt, moxieUserId: string): { creatorCoinsSold: string, moxieReceived: string } {
    // Find the share sale event log
    const shareTransferLog = receipt.logs.find(log => log.topics[0] === subjectShareSoldTopic0);
    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeSellSharesEvent] [${moxieUserId}] shareTransferLog: ${JSON.stringify(shareTransferLog)}`);

    if (!shareTransferLog) {
        throw new Error(`[creatorCoinSwap] [decodeSellSharesEvent] [${moxieUserId}] Share sale event log not found`);
    }

    // Decode the event data
    const decodedData = decodeEventLog({
        abi: BONDING_CURVE_ABI,
        data: shareTransferLog.data as `0x${string}`,
        topics: shareTransferLog.topics as [`0x${string}`, ...`0x${string}`[]]
    }) as unknown as SubjectShareSoldEvent;

    // Add null check for args to prevent potential undefined access
    if (!decodedData.args) {
        throw new Error(`[creatorCoinSwap] [decodeSellSharesEvent] [${moxieUserId}] Event args not found in decoded data`);
    }

    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeSellSharesEvent] [${moxieUserId}] decodedData: ${JSON.stringify(decodedData, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    )}`);

    // Extract and format the transfer amounts
    const creatorCoinsSold = ethers.formatEther(decodedData.args._sellAmount);
    const moxieReceived = ethers.formatEther(decodedData.args._buyAmount);

    elizaLogger.debug(traceId,`[creatorCoinSwap] [decodeSellSharesEvent] [${moxieUserId}] creatorCoinsSold: ${creatorCoinsSold} moxieReceived: ${moxieReceived}`);

    return {
        creatorCoinsSold,
        moxieReceived
    };
}