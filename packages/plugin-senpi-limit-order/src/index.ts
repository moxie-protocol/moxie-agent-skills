export * from "./actions/limitOrderAction";

import type { Plugin } from "@senpi-ai/core";
import { limitOrderAction } from "./actions/limitOrderAction";

export const senpiLimitOrderPlugin: Plugin = {
    name: "senpiLimitOrderPlugin",
    description: "Senpi Limit Order plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [limitOrderAction],
};

export default senpiLimitOrderPlugin;
