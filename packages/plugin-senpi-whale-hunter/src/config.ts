export const TOP_CREATORS_COUNT = process.env.TOP_CREATORS_COUNT ? parseInt(process.env.TOP_CREATORS_COUNT) : 25;
export const FREEMIUM_TRENDING_CREATORS = process.env.FREEMIUM_TRENDING_CREATORS || '';
export const MOXIE_BACKEND_INTERNAL_URL = process.env.MOXIE_BACKEND_INTERNAL_URL || '';
export const DUNE_API_KEY = process.env.DUNE_API_KEY || '';
export const WHALE_HUNTER_QUERY_ID = process.env.WHALE_HUNTER_QUERY_ID ? parseInt(process.env.WHALE_HUNTER_QUERY_ID, 10) : 0;
export const BASE_RPC_URL: string = process.env["BASE_RPC_URL"] || "";