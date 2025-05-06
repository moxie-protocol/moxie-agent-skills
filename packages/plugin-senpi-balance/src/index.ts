import { Plugin } from "@senpi-ai/core";
import getMoxiePortfolio from "./actions/getMoxiePortfolio";
import getMoxieFanTokenPortfolio from "./actions/getMoxieFanTokenPortfolio";

export const senpiBalancePlugin: Plugin = {
    name: "Senpi Balance Plugin ",
    description: "Gives the user their balance, portfolio, positions, and more",
    actions: [getMoxiePortfolio, getMoxieFanTokenPortfolio],
    evaluators: [],
    providers: [],
};

export default senpiBalancePlugin;
