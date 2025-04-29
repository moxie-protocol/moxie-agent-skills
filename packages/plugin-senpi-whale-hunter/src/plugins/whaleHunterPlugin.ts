// Import necessary modules and actions
import { Plugin } from "@senpi-ai/core";
import { topTraders } from "../actions/topBaseTraders";
import { topTraderOfATokenAction } from "../actions/topTradersOfAToken";
import { topTokenHoldersAction } from "../actions/topTokenHoldersAction";

// Define the Whale Hunter Plugin
export const whaleHunterPlugin: Plugin = {
    // Plugin name
    name: "Moxie Whale Hunter plugin",
    description:
        "Offers insights into the leading/top holders of non-creator coins/tokens (ERC20), as well as the top traders on Base and other ERC20 tokens on the platform",
    actions: [topTraders, topTraderOfATokenAction, topTokenHoldersAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};
