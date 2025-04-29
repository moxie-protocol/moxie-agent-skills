
export interface PortfolioSummary {
    [userName: string]: {
        tokenBalances: any[];
        appBalances: any[];
    }
}

interface TokenInfo {
    symbol: string;
    address: string;
}

export interface TokenAddressList {
    tokens?: TokenInfo[];
    creatorCoins?: TokenInfo[];
}

export interface PortfolioUserRequested {
    requestedUsers: string[];
}