import { IAgentRuntime, State } from "@senpi-ai/core";
import { ethers } from "ethers";

export interface Transfer {
    sender: string;
    recipient: string; // Wallet address, ENS, or username/userId
    token: string; // Token name or symbol/address
    transferAmount: bigint | null;
    value_type: string;
    balance: Balance | null;
}

export interface Balance {
    source_token: string;
    type: "FULL" | "PERCENTAGE";
    percentage: number;
}

export interface ErrorDetails {
    missing_fields: string[];
    prompt_message: string;
}

export interface TransactionResponse {
    success: boolean;
    transaction_type: "DIRECT" | "BALANCE_BASED" | "MULTI_TRANSFER";
    is_followup: boolean;
    transfers: Transfer[];
    error: ErrorDetails;
    confirmation_required: boolean;
    confirmation_message: string;
}

export interface CallbackTemplate {
    text: string;
    content?: {
        error?: string;
        details?: string;
        action?: string;
        inReplyTo?: string;
        confirmation_required?: boolean;
        confirmation_message?: string;
    };
}
export interface FunctionResponse<T> {
    callBackTemplate?: CallbackTemplate;
    data?: T;
}

export interface Context {
    traceId: string;
    senpiUserId?: string;
    runtime: IAgentRuntime;
    state: State;
    provider?: ethers.JsonRpcProvider;
    [key: string]: any;
}

export type TokenDetails = {
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    tokenType: string;
    currentSenpiPriceInWEI?: string;
};

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
