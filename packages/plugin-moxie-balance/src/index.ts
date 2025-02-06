import { Plugin } from "@elizaos/core";
import getMoxiePortfolio from "./actions/getMoxiePortfolio";
import getMoxieFanTokenPortfolio from "./actions/getMoxieFanTokenPortfolio";
import getFanTokenTrends from "./actions/getFanTokenTrends";

export const moxieBalancePlugin: Plugin = {
    name: "Moxie Balance Plugin ",
    description: "Gives the user their balance, portfolio, positions, and more",
    actions: [getMoxiePortfolio, getMoxieFanTokenPortfolio],
    evaluators: [],
    providers: [],
};

export default moxieBalancePlugin;
