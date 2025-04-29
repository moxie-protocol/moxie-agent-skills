import { DuneClient } from "@duneanalytics/client-sdk";
import { PnlData } from "../types/type";
import { elizaLogger } from "@moxie-protocol/core";

const client = new DuneClient(process.env.DUNE_API_KEY!);


/**
 * Prepares a SQL query to fetch PnL data from Dune Analytics based on wallet response parameters
 *
 * @param walletResponse - Object containing query parameters
 * @param walletResponse.walletAddresses - Array of wallet addresses to filter by
 * @param walletResponse.moxieUserIds - Array of Moxie user IDs to filter by
 * @param walletResponse.tokenAddresses - Array of token contract addresses to filter by
 * @param walletResponse.analysisType - Type of analysis to perform ('PROFITABLE_TRADERS'|'LOSS_MAKING_TRADERS'|'WALLET_PNL'|'TOKEN_TRADERS')
 * @param walletResponse.maxResults - Maximum number of results to return (defaults to 15)
 * @param walletResponse.chain - Blockchain network to query (e.g. 'base')
 * @returns SQL query string for fetching PnL data
 */
export const preparePnlQuery = (walletResponse: any) => {
  const {
    walletAddresses,
    moxieUserIds,
    tokenAddresses,
    analysisType,
    maxResults,
  } = walletResponse;

  let query = `select moxie_user_id, token_address, profit_loss, token_sold_symbol, token_bought_symbol, total_sell_amount, total_buy_amount, total_sell_value_usd, total_buy_value_usd, buy_transaction_count, sale_transactions, avg_buy_price_usd, avg_sell_price_usd, is_oversold, first_sale_time, last_sale_time from dune.moxieprotocol.result_moxie_wallets`;
  const whereClauses = [];

  if (walletAddresses?.length > 0 && analysisType === "WALLET_PNL") {
    whereClauses.push(`wallet_address in (${walletAddresses.map((address) => `${address}`).join(",")})`);
  }

  if (moxieUserIds?.length > 0 && analysisType === "USER_PNL") {
    whereClauses.push(`moxie_user_id in (${moxieUserIds.map((id) => `'${id}'`).join(",")})`);
  }

  if (tokenAddresses?.length > 0 || analysisType === "TOKEN_TRADERS") {
    whereClauses.push(`token_address in (${tokenAddresses.map((address) => `${address}`).join(",")})`);
  }

  if (whereClauses.length > 0) {
    query += ` where ${whereClauses.join(" and ")}`;
  }

  if (analysisType) {
    // Add order by clause based on analysis type
    if (analysisType === "PROFITABLE_TRADERS" || analysisType === "WALLET_PNL" || analysisType === "TOKEN_TRADERS") {
      query += " order by profit_loss desc";
    } else if (analysisType === "LOSS_MAKING_TRADERS") {
      query += " order by profit_loss asc";
    } else {
      query += " order by profit_loss desc";
    }
  }

  // Add limit clause using maxResults or default to 15
  query += ` limit ${maxResults || 15}`;

  elizaLogger.debug(`[preparePnlQuery] query: ${query}`);
  return query;
};

/**
 * Fetches PnL data from Dune Analytics using a prepared SQL query
 *
 * @param query - SQL query string for fetching PnL data
 * @returns Array of PnL data objects
 */
export const fetchPnlData = async (query: string) => {
  let retries = 3;
  let lastError;

  while (retries > 0) {
    try {
      const result = await client.runSql({ query_sql: query });

      const pnlData = result.result.rows as unknown as PnlData[];

      elizaLogger.debug(`[fetchPnlData] PnL data: ${pnlData.length} rows`);

      return pnlData;
    } catch (error) {
      lastError = error;
      elizaLogger.error(`[fetchPnlData] Error fetching PnL data (${4-retries}/3 attempts): ${error}`);
      retries--;

      if (retries > 0) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // If we get here, all retries failed
  throw lastError;
};