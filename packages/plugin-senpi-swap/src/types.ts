import { State } from "@senpi-ai/core";

import { IAgentRuntime } from "@senpi-ai/core";
import { ethers } from "ethers";
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

export interface GetIndicativePriceResponse {
    chainId: number;
    price: string;
    buyAmount: string;
    buyToken: string;
    sellAmount: string;
    sellToken: string;
    blockNumber: string;
    estimatedPriceImpact: string;
    estimatedGas: string;
    totalNetworkFee: string;
    route: {
        tokens: Array<{
            address: string;
            symbol: string;
            name: string;
            decimals: number;
        }>;
        fills: Array<{
            source: string;
            proportionBps: string;
            from: string;
            to: string;
        }>;
    };
    fees: {
        zeroExFee: {
            amount: string;
            token: string;
            type: "volume";
        } | null;
        integratorFee: {
            amount: string;
            token: string;
            type: "volume";
        } | null;
        gasFee: {
            amount: string;
            token: string;
            type: "volume";
        } | null;
    };
    issues?: {
        balance?: {
            token: string;
            actual: string;
            expected: string;
        };
        allowance?: {
            token: string;
            actual: string;
            expected: string;
        };
    };
    permit2: {
        type: "Permit2";
        hash: string;
        eip712: {
            types: {
                PermitTransferFrom: Array<{ name: string; type: string }>;
                TokenPermissions: Array<{ name: string; type: string }>;
                EIP712Domain: Array<{ name: string; type: string }>;
            };
            domain: {
                name: string;
                chainId: number;
                verifyingContract: string;
            };
            message: {
                permitted: {
                    token: string;
                    amount: string;
                };
                spender: string;
                nonce: string;
                deadline: string;
            };
            primaryType: string;
        };
    };
}

export interface Context {
    traceId: string;
    moxieUserId?: string;
    runtime: IAgentRuntime;
    state: State;
    provider?: ethers.JsonRpcProvider;
    [key: string]: any;
}
