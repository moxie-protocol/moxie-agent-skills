export interface BaseToken {
    name: string;
    symbol: string;
}

export interface Token {
    balance: number;
    balanceUSD: number;
    baseToken: BaseToken;
}

export interface TokenBalance {
    address: string;
    network: string;
    token: Token;
}

interface DisplayProps {
    label: string;
}

export interface AppTokenPosition {
    type: 'app-token';
    address: string;
    network: string;
    appId: string;
    groupId: string;
    balance: string;
    balanceUSD: number;
    price: number;
    symbol: string;
    decimals: number;
    displayProps?: DisplayProps;
}

export interface ContractPosition {
    type: 'contract-position';
    address: string;
    network: string;
    appId: string;
    groupId: string;
    balance?: string;
    balanceUSD?: number;
    displayProps?: DisplayProps;
}

export interface Product {
    label: string;
    assets: (AppTokenPosition | ContractPosition)[];
    meta: any[];
}

export interface AppBalance {
    address: string;
    appId: string;
    network: string;
    balanceUSD: number;
    products: Product[];
}

export interface PortfolioResponse {
    data: {
        data: {
            portfolio: Portfolio;
        }
    }
}
export interface Portfolio {
    tokenBalances: TokenBalance[];
    appBalances: AppBalance[];
}
