import qs from "qs";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";

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
        const params = qs.stringify({
            chainId: 8453,
            taker: wallet.address,
            sellToken,
            buyToken: "ETH",
            sellAmount,
        });

        const response = await fetch(`${API_BASE}/quote?${params}`, {
            headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`0x API error: ${response.status} ${errorBody}`);
            throw new Error(`Failed to fetch 0x quote: ${response.statusText}`);
        }

        const quote = await response.json();

        const { hash } = await wallet.sendTransaction("8453", {
            toAddress: quote.to,
            data: quote.data,
            value: quote.value || "0",
        });

        console.log(`Swap tx sent: ${hash}`);
        return hash;
    } catch (err) {
        console.error("Swap failed:", err);
        return null;
    }
}
