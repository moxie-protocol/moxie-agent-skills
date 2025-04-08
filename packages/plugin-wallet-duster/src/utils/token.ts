import qs from "qs";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";
import {
    concat,
    encodeFunctionData,
    erc20Abi,
    Hex,
    numberToHex,
    size,
} from "viem";
import { elizaLogger } from "@moxie-protocol/core";
import { ethers } from "ethers";

export type TokenBalance = {
    address: string;
    amount: string;
    usdValue: number;
};

const API_KEY = process.env.ZERO_EX_API_KEY!;
const API_BASE = "https://api.0x.org/swap/permit2";

const headers = {
    "Content-Type": "application/json",
    "0x-api-key": API_KEY,
    "0x-version": "v2",
};

export async function swapTokenToETH(
    wallet: MoxieWalletClient,
    sellToken: string,
    sellAmount: string
): Promise<string | null> {
    try {
        const approveTx = await wallet.sendTransaction("8453", {
            toAddress: sellToken,
            data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [wallet.address as `0x${string}`, BigInt(sellAmount)],
            }),
        });

        elizaLogger.log("Approve tx sent:", approveTx);

        const params = qs.stringify({
            chainId: 8453,
            taker: wallet.address,
            sellToken,
            buyToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            sellAmount,
        });

        const response = await fetch(`${API_BASE}/quote?${params}`, {
            headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            elizaLogger.error(`0x API error: ${response.status} ${errorBody}`);
            throw new Error(`Failed to fetch 0x quote: ${response.statusText}`);
        }

        const quote = await response.json();

        if (quote.transaction.data) {
            const provider = new ethers.JsonRpcProvider(
                process.env.BASE_RPC_URL
            );
            const feeData = await provider.getFeeData();
            const maxPriorityFeePerGas =
                (feeData.maxPriorityFeePerGas! * BigInt(120)) / BigInt(100);
            const maxFeePerGas =
                (feeData.maxFeePerGas! * BigInt(120)) / BigInt(100);
            const transactionInput = {
                address: wallet.address,
                chainType: "ethereum",
                caip2: `eip155:${process.env.CHAIN_ID || "8453"}`,
                transaction: {
                    to: quote.transaction.to,
                    value: Number(quote.transaction.value),
                    data: quote.transaction.data,
                    gasLimit: Math.ceil(Number(quote.transaction.gas) * 1.2), // added 20% buffer
                    gasPrice: Number(quote.transaction.gasPrice),
                    chainId: Number(process.env.CHAIN_ID || "8453"),
                },
            };
            elizaLogger.debug(
                `[swapTokenToETH] transactionInput: ${JSON.stringify(transactionInput)}`
            );
            const tx = await wallet.sendTransaction(
                process.env.CHAIN_ID || "8453",
                {
                    fromAddress: wallet.address,
                    toAddress: quote.transaction.to,
                    value: Number(quote.transaction.value),
                    data: quote.transaction.data,
                    gasLimit: Math.ceil(Number(quote.transaction.gas) * 1.2), // added 20% buffer
                    gasPrice: Number(quote.transaction.gasPrice),
                    maxFeePerGas: Number(maxFeePerGas),
                    maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
                }
            );
            elizaLogger.debug(`[swapTokenToETH] tx hash: ${tx.hash}`);

            return tx.hash;
        } else {
            throw new Error(
                "Failed to obtain a signature, transaction not sent."
            );
        }
    } catch (err) {
        throw new Error(`Failed to swap token to ETH: ${err}`);
    }
}
