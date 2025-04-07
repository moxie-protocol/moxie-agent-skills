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
                "https://mainnet.base.org"
            );
            const feeData = await provider.getFeeData();
            const maxPriorityFeePerGas =
                (BigInt(feeData.maxPriorityFeePerGas!.toString()) *
                    BigInt(120)) /
                BigInt(100);
            const maxFeePerGas =
                (BigInt(feeData.maxFeePerGas!.toString()) * BigInt(120)) /
                BigInt(100);

            const { hash } = await wallet.sendTransaction("8453", {
                toAddress: quote?.transaction.to,
                data: quote.transaction.data,
                value: quote?.transaction.value
                    ? Number(quote.transaction.value)
                    : undefined,
                gasLimit: quote.transaction.gasPrice,
                maxFeePerGas: Number(maxFeePerGas),
                maxPriorityFeePerGas: Number(maxPriorityFeePerGas),
            });

            elizaLogger.log(`Swap tx sent: ${hash}`);
            return hash;
        } else {
            throw new Error(
                "Failed to obtain a signature, transaction not sent."
            );
        }
    } catch (err) {
        throw new Error(`Failed to swap token to ETH: ${err}`);
    }
}
