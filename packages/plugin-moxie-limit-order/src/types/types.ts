import { HandlerCallback, IAgentRuntime, State } from "@moxie-protocol/core";
import { Portfolio } from "@moxie-protocol/moxie-agent-lib";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";
import { ethers } from "ethers";

export interface Balance {
    source_token: string;
    type: "FULL" | "PERCENTAGE";
    percentage: number;
}

export interface ErrorDetails {
    missing_fields: string[];
    prompt_message: string;
}

export interface CallbackTemplate {
    text: string;
    cta?: string[] | string;
    content?: {
        error?: string;
        details?: string;
        action?: string;
        inReplyTo?: string;
        confirmation_required?: boolean;
        confirmation_message?: string;
        type?: string;
    };
}
export interface FunctionResponse<T> {
    callBackTemplate?: CallbackTemplate;
    data?: T;
}

export interface Context {
    traceId: string;
    moxieUserId?: string;
    runtime: IAgentRuntime;
    state: State;
    provider?: ethers.providers.JsonRpcProvider;
    agentWalletBalance?: Portfolio;
    callback?: HandlerCallback;
    [key: string]: any;
}

export interface LimitOrderResponse {
    confirmation_required: boolean;
    confirmation_message: string;
    limit_orders: Array<LimitOrder>;
    error: {
        missing_fields: string[];
        prompt_message: string;
    } | null;
}

export interface LimitOrder {
    operation_description: string;
    sellToken: string;
    buyToken: string;
    type: 'SELL' | 'BUY' | 'SWAP';
    execution_type: 'IMMEDIATE' | 'FUTURE';
    limitPrice: {
        value: number;
        type: 'PERCENTAGE' | 'TOKEN_PRICE';
    };
    buyQuantity: number;
    order_type: 'TAKE_PROFIT' | 'STOP_LOSS';
    sellQuantity: number;
    expirationTime: string;
    value_type: 'USD';
    balance: Balance | null;
    error: {
        missing_fields: string[];
        prompt_message: string;
    } | null;
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
