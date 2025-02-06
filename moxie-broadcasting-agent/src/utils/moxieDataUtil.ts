import axios from 'axios';
import { elizaLogger } from '@elizaos/core';
import {
    CreatorCoin, CreatorCoinDetails,
    MoxieTokenDetails,
    CreatorCoinBurnDetail, CreatorCoinBuyBurnDetails,
    WhaleBuySellDetail, CreatorCoinWhaleBuySellDetails
} from '../types/broadcast';
import {
    ORDER_SUBGRAPH_URL,
    SNAPSHOT_SUBGRAPH_URL,
    MOXIE_TOKEN_API,
    CREATOR_COIN_USER_URL,
    CREATOR_COIN_NON_USER_URL,
    BATCH_SIZE
} from '../config/dotenvConfig';
import { WHALE_BUY_BAN_LIST } from '../config/dotenvConfig';
import {ftaService, moxieUserService} from "@elizaos/moxie-lib";

export class MoxieDataProvider {

  private static instance: MoxieDataProvider;

  constructor() {
    elizaLogger.info('Initializing MoxieDataProvider');
    // elizaLogger.info(`Subgraph GRAPHQL_URL: ${MoxieDataProvider.GRAPHQL_URL}`);
  }

  public static getInstance(): MoxieDataProvider {
    if (!this.instance) {
      this.instance = new MoxieDataProvider();
    }
    return this.instance;
  }

  private async processBatch<T>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<any[]>): Promise<any[]> {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        elizaLogger.info(`Processing batch: ${batch}`);
        const batchResults = await processor(batch);
        results.push(...batchResults);
    }
    return results;
  }

  private async enrichCreatorCoinDetails<T>(
    coins: T[],
    getSymbol: (coin: T) => string,
    enrichCoin: (coin: T, moxieUserId: string | undefined, userDetails: any | undefined) => T
  ): Promise<T[]> {
    // Get all unique creator symbols
    const allCreatorSymbols = [...new Set(coins.map(getSymbol))];

    // Fetch FTA user mappings for the creator symbols
    const batchSize = Number(BATCH_SIZE);
    const ftaUserMappings = await this.processBatch(allCreatorSymbols, batchSize,
      async (batch) => await ftaService.getFtaUserMapping(batch)
    );

    // Create a mapping of entity symbols to Moxie user IDs
    const symbolToMoxieUserId = new Map<string, string>();
    ftaUserMappings.forEach((mapping) => {
        if (mapping.moxieUserId) {
            symbolToMoxieUserId.set(mapping.entitySymbol, mapping.moxieUserId);
        }
    });

    // Get all unique Moxie user IDs
    const moxieUserIds = [...new Set(symbolToMoxieUserId.values())];

    // Process Moxie user IDs in batches
    const userDetailsMap = new Map();
    const userDetailsBatches = await this.processBatch(moxieUserIds, batchSize,
      async (batch) => {
        const batchDetails = await moxieUserService.getUserByMoxieIdMultiple(batch);
        return Array.from(batchDetails.entries());
      }
    );

    userDetailsBatches.forEach(([key, value]) => userDetailsMap.set(key, value));

    // Enrich coin details with user data, ensuring no records are filtered out
    return coins.map((coin) => {
        const creatorCoinSymbol = getSymbol(coin);
        const moxieUserId = symbolToMoxieUserId.get(creatorCoinSymbol);
        const userDetails = moxieUserId ? userDetailsMap.get(moxieUserId) : undefined;

      return enrichCoin(coin, moxieUserId, userDetails);
    });
  }


  /**
   * Fetch creator coins details ordered by market cap in descending order.
   * Subject token and creator coins are the same.
   * @returns List of creator coins along with their current & previous day prices and unique holders.
   */
  public async fetchCreatorCoinsByMarketCap(
    number = 100,
    marketCapUSD: number = 500,
    marketCapChangeCriteria: number = 5,
  ): Promise<CreatorCoinDetails[]> {

    try {
        // Fetch Moxie Token Details to get exchange_rate
        const moxieTokenDetails = await this.moxieTokenBurnDetails();
        const exchangeRate = parseFloat(moxieTokenDetails.currentPriceInUSD);

        if (isNaN(exchangeRate) || exchangeRate <= 0) {
            throw new Error('Invalid exchange rate');
        }

        const marketCapInMoxie = Math.floor(marketCapUSD / exchangeRate);

        // Calculate the start of the previous day in UNIX timestamp
        const now = new Date();
        const startOfPreviousDay = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() - 1, // Go to the previous day
            0, 0, 0, 0 // Set time to midnight
        )).getTime() / 1000; // Convert to seconds (UNIX timestamp)

        const query = `
        {
            subjectTokens(
                orderBy: uniqueHolders
                orderDirection: desc
                where: { marketCap_gt: ${marketCapInMoxie}, updatedAtBlockInfo_: {timestamp_gt: ${startOfPreviousDay} } }
                first: ${number}
            ) {
                marketCap
                name
                symbol
                uniqueHolders
                currentPriceInMoxie
                previousDaySnapshot: latestRollingDailySnapshot {
                    previousDayPriceInMoxie: startPrice
                    uniqueHoldersPreviousDay: startUniqueHolders
                    previousDayMarketCap: startMarketCap
                }
            }
        }`;

        console.log(query);

        const creatorCoins = await this.executeGraphQL<CreatorCoin[]>(query, 'subjectTokens', SNAPSHOT_SUBGRAPH_URL);

        // Transform CreatorCoins to CreatorCoinDetails
        const creatorCoinsData = creatorCoins.map((coin) => ({
            creatorTokenName: coin.name,
            creatorTokenSymbol: coin.symbol,
            marketCapInUSD: (parseFloat(coin.marketCap) * exchangeRate).toFixed(2),
            previousDayMarketCapInUSD: (parseFloat(coin.previousDaySnapshot.previousDayMarketCap) * exchangeRate).toFixed(2),
            marketCapChangePercentage: (
                ((parseFloat(coin.marketCap) - parseFloat(coin.previousDaySnapshot.previousDayMarketCap)) / parseFloat(coin.previousDaySnapshot.previousDayMarketCap)) * 100
            ).toFixed(2),
            uniqueHolders: coin.uniqueHolders,
            uniqueHoldersPreviousDay: coin.previousDaySnapshot.uniqueHoldersPreviousDay,
            previousDayPriceInUSD: (
            parseFloat(coin.previousDaySnapshot.previousDayPriceInMoxie) * exchangeRate
            ).toFixed(2),
            currentPriceInUSD: (parseFloat(coin.currentPriceInMoxie) * exchangeRate).toFixed(2),
        }));

        // Filter creator coins based on market cap change criteria
        const filteredCoins = creatorCoinsData.filter(
            (coin) => parseFloat(coin.marketCapChangePercentage) >= marketCapChangeCriteria
        );

        return this.enrichCreatorCoinDetails(filteredCoins, (coin) => coin.creatorTokenSymbol, (coin, moxieUserId, userDetails) => ({
            ...coin,
            creatorCoinUrl: moxieUserId ? `${CREATOR_COIN_USER_URL}${moxieUserId}` : `${CREATOR_COIN_NON_USER_URL}${coin.creatorTokenSymbol.replace(':', '_')}`,
            twitterHandle: userDetails?.identities.find((identity) => identity?.type === 'TWITTER')?.metadata?.username || undefined,
        }));

    } catch (error) {
        elizaLogger.error('Error fetching Moxie token details', error);
        throw new Error(
            `Failed to fetch Moxie token details: ${error.message || 'Unknown error'}`
        );
    }
  }

  /**
   * Fetch Moxie token burn details from the REST API.
   * @returns Moxie token supply details.
   */
  public async moxieTokenBurnDetails(): Promise<MoxieTokenDetails> {
    try {
        // Define the GraphQL query
        const query = `
            query GetPrices {
                GetPrices(
                    input: {
                        tokenAddress: "0x8C9037D1Ef5c6D1f6816278C7AAF5491d24CD527"
                        blockchain: base
                    }
                ) {
                    tokenAddress
                    currentPriceInUSD
                }
            }
        `;
        const data = await this.executeGraphQL<MoxieTokenDetails>(query, 'GetPrices', MOXIE_TOKEN_API);

        return data;
    } catch (error) {
        elizaLogger.error('Error fetching Moxie token burn details via GraphQL', error);
        throw new Error(
            `Failed to fetch Moxie token burn details via GraphQL: ${error.message || 'Unknown error'}`
        );
    }
  }

  /**
   * Fetch Moxie creator coins burn details from the REST API.
   */
  public async fetchCreatorCoinsBuyBurnDetails(
    lastXMinutes: number = 120,
    limit: number = 100,
    marketCapUSD: number = 500,
    burnRateUSDCriteria: number = 50,
  ): Promise<CreatorCoinBuyBurnDetails[]> {

    try {

        // Get the current time
        const currentTime = new Date();

        // Calculate the time `lastXMinutes` ago
        const lastXMinutesAgo = new Date(
        currentTime.getTime() - lastXMinutes * 60 * 1000
        );

        // Convert to UNIX timestamp (in seconds)
        const lastXMinutesAgoUnix = Math.floor(lastXMinutesAgo.getTime() / 1000);

        // Fetch Moxie Token Details to get exchange_rate
        const moxieTokenDetails = await this.moxieTokenBurnDetails();
        const exchangeRate = parseFloat(moxieTokenDetails.currentPriceInUSD);

        if (isNaN(exchangeRate) || exchangeRate <= 0) {
            throw new Error('Invalid exchange rate');
        }

        const marketCapInMoxie = Math.floor(marketCapUSD / exchangeRate);

        // GraphQL query
        const query = `
        {
        orders(
            orderBy: blockTimestamp
            orderDirection: desc
            first: ${limit}
            where: {
                orderType_not_in: [AUCTION, SELL]
                protocolTokenAmount_gt: "100000000000000000000"
                user_: { id: "0x0000000000000000000000000000000000000000" }
                blockTimestamp_gt: ${lastXMinutesAgoUnix}
                marketCap_gt: ${marketCapInMoxie}
            }
        ) {
            price
            marketCap
            blockTimestamp
            protocolTokenAmount
            subjectAmount
            subjectToken {
                name
                symbol
            }
        }
        }`;

        console.log(query);

        const creatorCoins = await this.executeGraphQL<CreatorCoinBurnDetail[]>(query, 'orders', ORDER_SUBGRAPH_URL);

        const creatorCoinBurnDetails = creatorCoins.map((coin) => ({
            creatorCoinName: coin.subjectToken.name,
            creatorCoinSymbol: coin.subjectToken.symbol,
            marketCapInUSD: (parseFloat(coin.marketCap) * exchangeRate).toFixed(2),
            creatorCoinPriceInUSD: (parseFloat(coin.price) * exchangeRate).toFixed(2),
            quantityCoinsBurned: (parseFloat(coin.subjectAmount) / 10 ** 18).toFixed(4),
            amountSpentToBurnInUSD: (
                (parseFloat(coin.protocolTokenAmount) / 10 ** 18) *
                exchangeRate
            ).toFixed(2),
            blockTimestamp: coin.blockTimestamp,
        }));

        const filteredCreatorCoinBurnDetails = creatorCoinBurnDetails.filter(
            (coin) => parseFloat(coin.amountSpentToBurnInUSD) >= burnRateUSDCriteria
        );

        return this.enrichCreatorCoinDetails(filteredCreatorCoinBurnDetails, (coin) => coin.creatorCoinSymbol, (coin, moxieUserId, userDetails) => ({
            ...coin,
            creatorCoinUrl: moxieUserId ? `${CREATOR_COIN_USER_URL}${moxieUserId}` : `${CREATOR_COIN_NON_USER_URL}${coin.creatorCoinSymbol.replace(':', '_')}`,
            twitterHandle: userDetails?.identities.find((identity) => identity?.type === 'TWITTER')?.metadata?.username || undefined,
        }));

    } catch (error) {
        elizaLogger.error('Error fetching Creator Coin buy burn details', error);
        throw new Error(
            `Failed to fetch Creator Coin buy burn details: ${error.message || 'Unknown error'}`
        );
    }
  }

  /**
   * Fetch Moxie whale buy and sell transactions from the REST API.
   */
  public async fetchWhaleBuySellTransactions(
    lastXMinutes: number = 120,
    limit: number = 1000,
    marketCapUSD: number = 500,
    whalePurchaseCriteriaUSD: number = 500,
): Promise<CreatorCoinWhaleBuySellDetails[]> {
    try {
        // Fetch Moxie Token Details to get exchange_rate
        const moxieTokenDetails = await this.moxieTokenBurnDetails();
        const exchangeRate = parseFloat(moxieTokenDetails.currentPriceInUSD);

        if (isNaN(exchangeRate) || exchangeRate <= 0) {
            throw new Error('Invalid exchange rate');
        }

        // Calculate the market cap in Moxie
        const marketCapInMoxie = Math.floor(marketCapUSD / exchangeRate);

        // Calculate the timestamp for filtering
        const lastXMinutesAgo = Math.floor((Date.now() - lastXMinutes * 60 * 1000) / 1000);

        const query = `
        {
            orders(
                orderBy: blockTimestamp
                orderDirection: desc
                first: ${limit}
                where: {
                    orderType_not_in: [AUCTION, SELL]
                    protocolTokenAmount_gt: "5000000000000000000"
                    blockTimestamp_gt: ${lastXMinutesAgo}
                    marketCap_gt: ${marketCapInMoxie}
                    user_: {id_not: "0x0000000000000000000000000000000000000000"}
                }
            ) {
                id
                price
                marketCap
                orderType
                blockTimestamp
                protocolTokenAmount
                subjectAmount
                subjectFee
                protocolFee
                subjectToken {
                    name
                    symbol
                }
                user {
                    id
                }
            }
        }`;

        console.log(query);

        const whaleTransactions = await this.executeGraphQL<WhaleBuySellDetail[]>(query, 'orders', ORDER_SUBGRAPH_URL);

        console.log(`Original whaleTransactions.length: ${whaleTransactions.length}`);

        if (whaleTransactions.length === 0) {
            return [];
        }

        const whaleBuyBanList = WHALE_BUY_BAN_LIST.split(',');
        const whaleBuyBanListSet = new Set(whaleBuyBanList);
        const whaleBuyBanListArray = Array.from(whaleBuyBanListSet);

        // Fetch banned wallet addresses based on Moxie IDs
        const moxieUserData = await moxieUserService.getUserByMoxieIdMultiple(whaleBuyBanListArray);
        const bannedWalletAddresses = Array.from(moxieUserData.values())
            .flatMap(user => user.wallets || []) // Extract wallets array or empty if undefined
            .map(wallet => wallet.walletAddress) // Extract walletAddress
            .filter(Boolean); // Remove undefined or null wallet addresses

        const bannedWalletsSet = new Set(bannedWalletAddresses.map(address => address.toLowerCase()));

        // Filter and transform transactions
        // First filter out banned wallets
        // First filter and map transactions
        const filteredTransactions = whaleTransactions
            .filter(transaction => !bannedWalletsSet.has(transaction.user.id.toLowerCase()))
            .map(transaction => ({
                creatorCoinName: transaction.subjectToken.name,
                creatorCoinSymbol: transaction.subjectToken.symbol,
                marketCapInUSD: (parseFloat(transaction.marketCap) * exchangeRate).toFixed(2),
                creatorCoinPriceInUSD: (parseFloat(transaction.price) * exchangeRate).toFixed(2),
                quantityBought: (parseFloat(transaction.subjectAmount) / 10 ** 18).toFixed(4),
                amountSpentInUSD: (parseFloat(transaction.protocolTokenAmount) / 10 ** 18 * exchangeRate).toFixed(2),
                orderType: transaction.orderType,
                feeEarnedByCreatorInUSD: ((parseFloat(transaction.subjectFee) / 10 ** 18) * exchangeRate).toFixed(2),
                feeEarnedByProtocolInUSD: ((parseFloat(transaction.protocolFee) / 10 ** 18) * exchangeRate).toFixed(2),
                blockTimestamp: transaction.blockTimestamp,
                baseAddressOfPurchaser: transaction.user.id,
            }))
            .filter(transaction => parseFloat(transaction.amountSpentInUSD) >= whalePurchaseCriteriaUSD);

        // Get purchaser details from wallet addresses
        const purchaserWalletAddresses = [...new Set(filteredTransactions.map(t => t.baseAddressOfPurchaser.toLowerCase()))];
        const purchaserDetails = await moxieUserService.getUserByWalletAddressMultiple(purchaserWalletAddresses);

        // Create mapping of wallet address to user details
        const walletToUserDetails = new Map();
        purchaserDetails.forEach((user, walletAddress) => {
            walletToUserDetails.set(walletAddress, user);
        });

        // Enrich transactions with both creator and purchaser details
        const whaleTransactionsFiltered = await this.enrichCreatorCoinDetails(
            filteredTransactions,
            (transaction) => transaction.creatorCoinSymbol,
            (transaction, moxieUserId, creatorDetails) => {
                const purchaserDetails = walletToUserDetails.get(transaction.baseAddressOfPurchaser.toLowerCase());

                // Get Twitter identity from creator details
                const twitterIdentity = creatorDetails?.identities?.find(
                    (identity) => identity.type === "TWITTER"
                );
                const twitterHandle = twitterIdentity?.metadata?.username || '';

                // Get Twitter identity from purchaser details
                const purchaserTwitterIdentity = purchaserDetails?.identities?.find(
                    (identity) => identity.type === "TWITTER"
                );
                const purchaserTwitterHandle = purchaserTwitterIdentity?.metadata?.username || '';

                return {
                    ...transaction,
                    creatorCoinTwitterHandle: twitterHandle,
                    creatorCoinUrl: creatorDetails ? `${CREATOR_COIN_USER_URL}${moxieUserId}` : `${CREATOR_COIN_NON_USER_URL}${transaction.creatorCoinSymbol}`,
                    twitterHandleOfPurchaser: purchaserTwitterHandle,
                    nameOfPurchaser: purchaserDetails?.userName || ''
                };
            }
        );

        console.log(`Filtered whaleTransactions.length: ${whaleTransactionsFiltered.length}`);

        return whaleTransactionsFiltered;
    } catch (error) {
        elizaLogger.error('Error fetching Whale Buy/Sell transactions', error);
        throw new Error(
            `Failed to fetch Whale Buy/Sell transactions: ${error.message || 'Unknown error'}`
        );
    }
}


  /**
   * Execute a GraphQL query.
   * @param query - The GraphQL query string.
   * @param key - The key to extract data from the response.
   * @returns The extracted data from the GraphQL server response.
   */
  private async executeGraphQL<T>(query: string, key: string, graphqUrl: string): Promise<T> {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await axios.post(
        graphqUrl,
        { query },
        { headers }
      );

      if (response.data.errors) {
        elizaLogger.error('GraphQL query errors', response.data.errors);
        throw new Error(
          `GraphQL errors: ${JSON.stringify(response.data.errors)}`
        );
      }

      return response.data.data[key];
    } catch (error) {
      elizaLogger.error(`Error executing GraphQL query for key: ${key}`, error);
      throw new Error(
        `Failed to execute GraphQL query: ${error.message || 'Unknown error'}`
      );
    }
  }
}
