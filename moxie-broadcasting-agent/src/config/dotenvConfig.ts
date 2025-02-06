import dotenv from 'dotenv';

dotenv.config();

export const SUBGRAPH_API_KEY = process.env.SUBGRAPH_API_KEY;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const TWITTER_USERNAME = process.env.TWITTER_USERNAME;
export const TWITTER_PASSWORD = process.env.TWITTER_PASSWORD;
export const TWITTER_EMAIL = process.env.TWITTER_EMAIL;
export const POSTGRES_URL = process.env.POSTGRES_URL;
export const REDIS_URL = process.env.REDIS_URL;

export const CREATOR_COIN_SUMMARY_CRON_SCHEDULE = process.env.CREATOR_COIN_SUMMARY_CRON_SCHEDULE || '0 */4 * * *'; // Every 4 hours
export const CREATOR_COIN_BB_SUMMARY_CRON_SCHEDULE = process.env.CREATOR_COIN_BB_SUMMARY_CRON_SCHEDULE || '30 2-22/4 * * *'; // Every 4 hours, but offset (starts at 2:30 AM and repeats every 4 hours)
export const WHALE_PURCHASES_SUMMARY_CRON_SCHEDULE = process.env.WHALE_PURCHASES_SUMMARY_CRON_SCHEDULE || '*/5 * * * *'; // Every 5 minutes

export const WHALE_PURCHASE_LAST_X_MINUTES = process.env.WHALE_PURCHASE_LAST_X_MINUTES || 480;
export const WHALE_PURCHASE_LIMIT = process.env.WHALE_PURCHASE_LIMIT || 1000;
export const WHALE_PURCHASE_MARKET_CAP_USD = process.env.WHALE_PURCHASE_MARKET_CAP_USD || 500;
export const WHALE_PURCHASE_CRITERIA_USD = process.env.WHALE_PURCHASE_CRITERIA_USD || 300;

export const CREATOR_COIN_BURN_LAST_X_MINUTES = process.env.CREATOR_COIN_BURN_LAST_X_MINUTES || 960;
export const CREATOR_COIN_BURN_LIMIT = process.env.CREATOR_COIN_BURN_LIMIT || 1000;
export const CREATOR_COIN_BURN_MARKET_CAP_USD = process.env.CREATOR_COIN_BURN_MARKET_CAP_USD || 500;
export const CREATOR_COIN_BURN_CRITERIA_USD = process.env.CREATOR_COIN_BURN_CRITERIA_USD || 50;

export const CREATOR_COIN_NUMBER = process.env.CREATOR_COIN_NUMBER || 1000;
export const CREATOR_COIN_MARKET_CAP_USD = process.env.CREATOR_COIN_MARKET_CAP_USD || 500;
export const CREATOR_COING_MARKET_CAP_CHANGE_CRITERIA = process.env.CREATOR_COING_MARKET_CAP_CHANGE_CRITERIA || 8;

export const ORDER_SUBGRAPH_URL = process.env.ORDER_SUBGRAPH_URL;
export const SNAPSHOT_SUBGRAPH_URL = process.env.SNAPSHOT_SUBGRAPH_URL;
export const MOXIE_TOKEN_API = process.env.MOXIE_TOKEN_API;

export const WHALE_BUY_BAN_LIST = process.env.WHALE_BUY_BAN_LIST || 'M140,M178';
export const CREATOR_COIN_USER_URL = process.env.CREATOR_COIN_USER_URL || 'https://moxie.xyz/profile/';
export const CREATOR_COIN_NON_USER_URL = process.env.CREATOR_COIN_NON_USER_URL || 'https://moxie.xyz/token/';

export const ENABLE_TWEETS = process.env.ENABLE_TWEETS || false;

export const TWITTER_COOKIES = process.env.TWITTER_COOKIES;

export const BATCH_SIZE = process.env.BATCH_SIZE || 10;

export function validateEnv() {
    const requiredVars = {
        OPENAI_API_KEY,
        POSTGRES_URL,
        ORDER_SUBGRAPH_URL,
        SNAPSHOT_SUBGRAPH_URL,
        MOXIE_TOKEN_API,
        TWITTER_COOKIES,
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => value === '' || value === undefined)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }
  }