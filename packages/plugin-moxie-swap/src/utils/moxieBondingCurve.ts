import { elizaLogger, HandlerCallback } from "@elizaos/core";
import { privy, subjectSharePurchasedTopic0 } from "./swapCreatorCoins";
import { decodeEventLog, encodeFunctionData } from "viem";
import { EthereumSendTransactionInputType, EthereumSendTransactionResponseType } from "@privy-io/server-auth";
import { ethers } from "ethers";

type SubjectSharePurchasedEvent = {
    args: {
        _subject: string;
        _sellToken: string;
        _sellAmount: bigint;
        _spender: string;
        _buyToken: string;
        _buyAmount: bigint;
        _beneficiary: string;
    }
};


export const BONDING_CURVE_ABI = [
    {
      inputs: [
        {
          internalType: "address",
          name: "_subject",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_depositAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_minReturnAmountAfterFee",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "_orderReferrer",
          type: "address",
        },
      ],
      name: "buySharesV2",
      outputs: [
        {
          internalType: "uint256",
          name: "shares_",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_subject",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_sellAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_minReturnAmountAfterFee",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "_orderReferrer",
          type: "address",
        },
      ],
      name: "sellSharesV2",
      outputs: [
        {
          internalType: "uint256",
          name: "returnAmount_",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      "anonymous": false,
      "inputs": [
          {
              "indexed": true,
              "internalType": "address",
              "name": "_subject",
              "type": "address"
          },
          {
              "indexed": true,
              "internalType": "address",
              "name": "_sellToken",
              "type": "address"
          },
          {
              "indexed": false,
              "internalType": "uint256",
              "name": "_sellAmount",
              "type": "uint256"
          },
          {
              "indexed": false,
              "internalType": "address",
              "name": "_spender",
              "type": "address"
          },
          {
              "indexed": false,
              "internalType": "address",
              "name": "_buyToken",
              "type": "address"
          },
          {
              "indexed": false,
              "internalType": "uint256",
              "name": "_buyAmount",
              "type": "uint256"
          },
          {
              "indexed": true,
              "internalType": "address",
              "name": "_beneficiary",
              "type": "address"
          }
      ],
      "name": "SubjectSharePurchased",
      "type": "event"
      }
  ];

/**
 * Buys shares of a creator's tokens using the bonding curve contract
 * @param embeddedWallet The wallet address of the buyer
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @returns Promise that resolves to the transaction response from Privy
 * @throws Error if the transaction fails or if wallet has insufficient funds
 */
export async function buyShares(moxieUserId: string, embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint) {
    elizaLogger.debug(`[creatorCoinSwap] [buyShares] [${moxieUserId}] called with input details: [${embeddedWallet}] [${creatorSubjectAddress}] [${amountInWEI}]`)
    try {
        const swapRequestInput: EthereumSendTransactionInputType = {
            method: "eth_sendTransaction",
            address: embeddedWallet,
            chainType: "ethereum",
            caip2: "eip155:" + process.env.CHAIN_ID,
            params: {
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
                }
            }
        };
        elizaLogger.debug(`[creatorCoinSwap] [buyShares] [${moxieUserId}] swap request: ${JSON.stringify(swapRequestInput)}`)
        const swapResponse = await privy.walletApi.rpc(swapRequestInput)
        elizaLogger.debug(`[creatorCoinSwap] [buyShares] [${moxieUserId}] swap response: ${JSON.stringify(swapResponse)}`)
        return swapResponse;
    } catch (error) {
        elizaLogger.error(`[creatorCoinSwap] [buyShares] [${moxieUserId}] Error executing buyShares: ${JSON.stringify(error)}`);
        if (error.message?.includes("insufficient funds")) {
            throw new Error("Wallet has insufficient funds to execute the transaction (transaction amount + fees)");
        }
        throw error;
    }
}

/**
 * Creates input parameters for a buy shares transaction
 * @param embeddedWallet The wallet address of the buyer
 * @param creatorSubjectAddress The subject address of the creator whose tokens are being purchased
 * @param amountInWEI The amount of Moxie tokens to spend in WEI
 * @returns EthereumSendTransactionInputType object with transaction parameters
 */
export function createBuyRequestInput(embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint): EthereumSendTransactionInputType {
    return {
        address: embeddedWallet,
        chainType: "ethereum",
        caip2: "eip155:" + process.env.CHAIN_ID,
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
export function createSwapRequestInput(embeddedWallet: string, creatorSubjectAddress: string, amountInWEI: bigint): EthereumSendTransactionInputType {
    return createBuyRequestInput(embeddedWallet, creatorSubjectAddress, amountInWEI);
}


/**
 * Extracts and decodes share transfer details from a transaction receipt
 * @param receipt The transaction receipt containing the transfer logs
 * @param moxieUserId The user ID of the Moxie user
 * @returns Object containing the amount of creator coins bought and Moxie tokens sold
 */
export function decodeBuySharesEvent(receipt: ethers.TransactionReceipt, moxieUserId: string): {creatorCoinsBought: string, moxieSold: string} {
    // Find the share purchase event log
    const shareTransferLog = receipt.logs.find(log => log.topics[0] === subjectSharePurchasedTopic0);
    elizaLogger.debug(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] shareTransferLog: ${JSON.stringify(shareTransferLog)}`);

    if (!shareTransferLog) {
        throw new Error(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] Share transfer event log not found`);
    }

    // Decode the event data
    const decodedData = decodeEventLog({
        abi: BONDING_CURVE_ABI,
        data: shareTransferLog.data as `0x${string}`,
        topics: shareTransferLog.topics as [`0x${string}`, ...`0x${string}`[]]
    }) as unknown as SubjectSharePurchasedEvent;

    elizaLogger.debug(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] decodedData: ${JSON.stringify(decodedData, (key, value) =>
        typeof value === 'bigint'
            ? value.toString()
            : value
    )}`);

    // Extract and format the transfer amounts
    const creatorCoinsBought = ethers.formatEther(decodedData.args?._buyAmount);
    const moxieSold = ethers.formatEther(decodedData.args?._sellAmount);

    elizaLogger.debug(`[creatorCoinSwap] [decodeBuySharesEvent] [${moxieUserId}] creatorCoinsBought: ${creatorCoinsBought} moxieSold: ${moxieSold}`);

    return {
        creatorCoinsBought,
        moxieSold
    };
}

