export * from "./actions/creatorCoinSwap";

import type { Plugin } from "@elizaos/core";
import { creatorCoinSwapAction } from "./actions/creatorCoinSwap";
export * from "./actions/swap";
import { erc20swapAction } from "./actions/swap";

export const moxieSwapPlugin: Plugin = {
    name: "moxieSwapPlugin",
    description: "Moxie Swap plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [ erc20swapAction, creatorCoinSwapAction],
};

export default moxieSwapPlugin;
