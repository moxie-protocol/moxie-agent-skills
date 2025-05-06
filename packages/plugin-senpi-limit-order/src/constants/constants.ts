import { GetQuoteResponse } from "../types/types";

export const mockGetQuoteResponse: GetQuoteResponse = {
    blockNumber: "1",
    buyAmount: "1",
    buyToken: "1",
    sellAmount: "1",
    sellToken: "1",
    minBuyAmount: "1",
    liquidityAvailable: true,
    totalNetworkFee: "1",
    zid: "1",
    fees: {
        zeroExFee: {
            amount: "1",
            token: "1",
            type: "1",
        },
        integratorFee: {
            amount: "1",
            token: "1",
            type: "1",
        },
        gasFee: {
            amount: "1",
            token: "1",
            type: "1",
        },
    },
    issues: {
        allowance: null,
        balance: {
            token: "1",
            actual: "1",
            expected: "1",
        },
        simulationIncomplete: false,
        invalidSourcesPassed: [],
    },
    permit2: {
        type: "Permit2",
        hash: "1",
        eip712: {
            types: {},
            domain: {},
            message: {},
            primaryType: "1",
        },
    },
    route: {
        fills: [],
        tokens: [],
    },
    tokenMetadata: {
        buyToken: {
            buyTaxBps: "1",
            sellTaxBps: "1",
        },
        sellToken: {
            buyTaxBps: "1",
            sellTaxBps: "1",
        },
    },
    transaction: {
        to: "1",
        data: "1",
        gas: "1",
        gasPrice: "1",
        value: "1",
    },
};
