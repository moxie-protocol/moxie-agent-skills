import { SubjectToken } from "../utils/subgraph";
import { GetIndicativePriceResponse } from "../types/types";
export const mockSubjectTokenDetail: SubjectToken = {
    id: "0x123",
    name: "Test Subject Token",
    symbol: "TEST",
    decimals: 18,
    currentPriceInSenpi: "100",
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
};

export const mockSubjectTokenDetails: Record<string, SubjectToken> = {
    "0x123": mockSubjectTokenDetail,
    "0x456": {
        id: "0x456",
        name: "Test Subject Token 2",
        symbol: "TEST2",
        decimals: 18,
        currentPriceInSenpi: "100",
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
    },
};

export const mockGetIndicativePriceResponse: GetIndicativePriceResponse = {
    chainId: 8453,
    price: "100",
    buyAmount: "100",
    buyToken: "100",
    sellAmount: "100",
    sellToken: "100",
    blockNumber: "100",
    estimatedPriceImpact: "100",
    estimatedGas: "100",
    totalNetworkFee: "100",
    route: {
        tokens: [],
        fills: [],
    },
    fees: {
        zeroExFee: {
            amount: "100",
            token: "100",
            type: "volume",
        },
        integratorFee: {
            amount: "100",
            token: "100",
            type: "volume",
        },
        gasFee: {
            amount: "100",
            token: "100",
            type: "volume",
        },
    },
    issues: {
        balance: {
            token: "100",
            actual: "100",
            expected: "100",
        },
    },
    permit2: {
        type: "Permit2",
        hash: "100",
        eip712: {
            types: {
                PermitTransferFrom: [],
                TokenPermissions: [],
                EIP712Domain: [],
            },
            domain: {
                name: "100",
                chainId: 100,
                verifyingContract: "100",
            },
            message: {
                permitted: { token: "100", amount: "100" },
                spender: "100",
                nonce: "100",
                deadline: "100",
            },
            primaryType: "100",
        },
    },
};
