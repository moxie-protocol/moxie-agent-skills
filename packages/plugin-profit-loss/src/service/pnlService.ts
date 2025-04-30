import { DuneClient } from "@duneanalytics/client-sdk";
import { PnlData } from "../types/type";
import { elizaLogger } from "@moxie-protocol/core";

const client = new DuneClient(process.env.DUNE_API_KEY!);


/**
 * Prepares a SQL query to fetch PnL data from Dune Analytics based on wallet response parameters
 *
 * @param pnlResponse - Object containing query parameters
 * @param pnlResponse.walletAddresses - Array of wallet addresses to filter by
 * @param pnlResponse.moxieUserIds - Array of Moxie user IDs to filter by
 * @param pnlResponse.tokenAddresses - Array of token contract addresses to filter by
 * @param pnlResponse.analysisType - Type of analysis to perform ('PROFIT'|'LOSS')
 * @param pnlResponse.maxResults - Maximum number of results to return (defaults to 15)
 * @param pnlResponse.chain - Blockchain network to query (e.g. 'base')
 * @returns SQL query string for fetching PnL data
 */
export const preparePnlQuery = (pnlResponse: any) => {
  const {
    walletAddresses,
    moxieUserIds,
    tokenAddresses,
    analysisType,
    maxResults,
  } = pnlResponse;

  // Initialize select fields
  let selectFields = `moxie_user_id, token_address, profit_loss, token_sold_symbol, token_bought_symbol, total_sell_amount, total_buy_amount, total_sell_value_usd, total_buy_value_usd, buy_transaction_count, sale_transactions, avg_buy_price_usd, avg_sell_price_usd, is_oversold, first_sale_time, last_sale_time`;

  if (tokenAddresses?.length > 0) {
    selectFields = `wallet_address, ${selectFields}`;
  }

  let query = `select ${selectFields} from dune.moxieprotocol.result_moxie_wallets`;
  const whereClauses = [];
  const groupByClauses = [];
  let orderByClause = "";
  if (walletAddresses?.length > 0) {
    whereClauses.push(`wallet_address in (${walletAddresses.map((address) => `${address}`).join(",")})`);
    orderByClause = `profit_loss ${analysisType === "PROFIT" ? "desc" : "asc"}`;
  }


  if (moxieUserIds?.length > 0) {
    whereClauses.push(`moxie_user_id in (${moxieUserIds.map((id) => `'${id}'`).join(",")})`);
    selectFields = `moxie_user_id, token_address, SUM(profit_loss) as total_profit_loss, MAX(token_sold_symbol) as token_sold_symbol, MAX(token_bought_symbol) as token_bought_symbol, SUM(total_sell_amount) as total_sell_amount, SUM(total_buy_amount) as total_buy_amount, SUM(total_sell_value_usd) as total_sell_value_usd, SUM(total_buy_value_usd) as total_buy_value_usd, SUM(buy_transaction_count) as buy_transaction_count, SUM(sale_transactions) as sale_transactions, AVG(avg_buy_price_usd) as avg_buy_price_usd, AVG(avg_sell_price_usd) as avg_sell_price_usd`;
    query = `select ${selectFields} from dune.moxieprotocol.result_moxie_wallets`;
    groupByClauses.push(`token_address, moxie_user_id`);
    orderByClause = `total_profit_loss ${analysisType === "PROFIT" ? "desc" : "asc"}`;
  }

  if (tokenAddresses?.length > 0) {
    whereClauses.push(`token_address in (${tokenAddresses.map((address) => `${address}`).join(",")})`);
    orderByClause = `profit_loss ${analysisType === "PROFIT" ? "desc" : "asc"}`;
  }

  if (whereClauses.length > 0) {
    query += ` where ${whereClauses.join(" and ")}`;
  }

  if (groupByClauses.length > 0) {
    query += ` group by ${groupByClauses.join(", ")}`;
  }

  if (analysisType == "LOSS") {
    // Add order by clause based on analysis type
    orderByClause = `profit_loss asc`;
  }

  if (orderByClause) {
    query += ` order by ${orderByClause}`;
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