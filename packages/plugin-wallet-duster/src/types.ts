import { z } from "zod";

export const TransferEthSchema = z.object({
    amount: z.number().min(0),
    toAddress: z.string(),
    isENS: z.boolean(),
});

export const DustRequestSchema = z.object({
    threshold: z.number().min(0).nullable(),
});

export interface GetQuoteResponse {
    blockNumber: string;
    buyAmount: string;
    buyToken: string;
    sellAmount: string;
    sellToken: string;
    minBuyAmount: string;
    liquidityAvailable: boolean;
    totalNetworkFee: string;
    zid: string;
    fees: {
        zeroExFee: {
            amount: string;
            token: string;
            type: string;
        } | null;
        integratorFee: {
            amount: string;
            token: string;
            type: string;
        } | null;
        gasFee: {
            amount: string;
            token: string;
            type: string;
        } | null;
    };
    issues: {
        allowance: null;
        balance: {
            token: string;
            actual: string;
            expected: string;
        } | null;
        simulationIncomplete: boolean;
        invalidSourcesPassed: string[];
    };
    permit2: {
        type: "Permit2";
        hash: string;
        eip712: {
            types: Record<string, any>;
            domain: Record<string, any>;
            message: Record<string, any>;
            primaryType: string;
        };
    };
    route: {
        fills: Array<{
            from: string;
            to: string;
            source: string;
            proportionBps: string;
        }>;
        tokens: Array<{
            address: string;
            symbol: string;
        }>;
    };
    tokenMetadata: {
        buyToken: {
            buyTaxBps: string;
            sellTaxBps: string;
        };
        sellToken: {
            buyTaxBps: string;
            sellTaxBps: string;
        };
    };
    transaction: {
        to: string;
        data: string;
        gas: string;
        gasPrice: string;
        value: string;
    };
}
