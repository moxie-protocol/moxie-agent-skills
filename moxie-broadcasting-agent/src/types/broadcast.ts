export interface CreatorCoinBurnDetail {
    blockTimestamp: string;
    marketCap: string;
    price: string;
    protocolTokenAmount: string;
    subjectAmount: string;
    subjectToken: {
      name: string;
      symbol: string;
    }
};

export type CreatorCoinBuyBurnDetails = {
    creatorCoinName: string;
    creatorCoinSymbol: string;
    marketCapInUSD: string;
    creatorCoinPriceInUSD: string;
    quantityCoinsBurned: string;
    amountSpentToBurnInUSD: string;
    blockTimestamp: string;
    creatorCoinUrl?: string;
    twitterHandle?: string;
};

export interface CreatorCoin {
    currentPriceInMoxie: string;
    marketCap: string;
    name: string;
    previousDaySnapshot: {
      previousDayPriceInMoxie: string;
      uniqueHoldersPreviousDay: string;
      previousDayMarketCap: string;
    }
    symbol: string;
    uniqueHolders: string;
}

export type CreatorCoinDetails = {
    creatorTokenName: string;
    creatorTokenSymbol: string;
    marketCapInUSD: string;
    previousDayMarketCapInUSD: string;
    marketCapChangePercentage: string;
    uniqueHolders: string;
    uniqueHoldersPreviousDay: string;
    previousDayPriceInUSD: string;
    currentPriceInUSD: string;
    creatorCoinUrl?: string;
    twitterHandle?: string;
}

export interface MoxieTokenDetails {
    tokenAddress: string;
    currentPriceInUSD: string;
}

export interface WhaleBuySellDetail {
    price: string;
    marketCap: string;
    orderType: 'SELL' | 'BUY';
    blockTimestamp: string;
    protocolTokenAmount: string;
    subjectAmount: string;
    subjectFee: string;
    protocolFee: string;
    subjectToken: {
      name: string;
      symbol: string;
    };
    user: {
      id: string;
    };
}

export type CreatorCoinWhaleBuySellDetails = {
    creatorCoinName: string;
    creatorCoinSymbol: string;
    creatorCoinPriceInUSD: string;
    creatorCoinTwitterHandle?: string;
    creatorCoinUrl?: string;
    marketCapInUSD: string;
    orderType: 'SELL' | 'BUY';
    quantityBought: string;
    amountSpentInUSD: string;
    blockTimestamp: string;
    feeEarnedByCreatorInUSD: string;
    feeEarnedByProtocolInUSD: string;
    baseAddressOfPurchaser: string;
    twitterHandleOfPurchaser?: string;
    nameOfPurchaser?: string;
};



