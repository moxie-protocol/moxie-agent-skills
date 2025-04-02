import { SubjectToken } from "../utils/subgraph";
import { GetQuoteResponse } from "../types"

export const mockSubjectTokenDetail: SubjectToken = {
    id: "0x123",
    name: "Test Subject Token",
    symbol: "TEST",
    decimals: 18,
    currentPriceInMoxie: "100",
    currentPriceInWeiInMoxie: "100",
    reserve: "100",
    reserveRatio: "100",
    totalSupply: "100",
    initialSupply: "100",
    uniqueHolders: "100",
    lifetimeVolume: "100",
    subjectFee: "100",
    protocolFee: "100",
    buySideVolume: "100",
    sellSideVolume: "100",
    totalStaked: "100",
    protocolTokenInvested: "100",
    marketCap: "100",
    subject: {
        id: "0x123",
    },
    isGraduated: true,
};

export const mockSubjectTokenDetails: Record<string, SubjectToken> = {
    "0x123": mockSubjectTokenDetail,
    "0x456": {
        id: "0x456",
        name: "Test Subject Token 2",
        symbol: "TEST2",
        decimals: 18,
        currentPriceInMoxie: "100",
        currentPriceInWeiInMoxie: "100",
        reserve: "100",
        reserveRatio: "100",
        totalSupply: "100",
        initialSupply: "100",
        uniqueHolders: "100",
        lifetimeVolume: "100",
        subjectFee: "100",
        protocolFee: "100",
        buySideVolume: "100",
        sellSideVolume: "100",
        totalStaked: "100",
        protocolTokenInvested: "100",
        marketCap: "100",
        subject: {
            id: "0x456",
        },
        isGraduated: true,
    },
};


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
