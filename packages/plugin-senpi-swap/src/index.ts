export * from "./actions/tokenSwapAction";

import type { Plugin } from "@senpi-ai/core";
import { tokenSwapAction } from "./actions/tokenSwapAction";

export const senpiSwapPlugin: Plugin = {
    name: "senpiSwapPlugin",
    description: "Senpi Swap plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [tokenSwapAction],
};

export default senpiSwapPlugin;
