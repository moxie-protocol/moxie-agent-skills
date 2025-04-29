import { Plugin } from "@senpi-ai/core";
import getSenpiPortfolio from "./actions/getSenpiPortfolio";
import getSenpiFanTokenPortfolio from "./actions/getSenpiFanTokenPortfolio";

export const senpiBalancePlugin: Plugin = {
    name: "Senpi Balance Plugin ",
    description: "Gives the user their balance, portfolio, positions, and more",
    actions: [getSenpiPortfolio, getSenpiFanTokenPortfolio],
    evaluators: [],
    providers: [],
};

export default senpiBalancePlugin;
