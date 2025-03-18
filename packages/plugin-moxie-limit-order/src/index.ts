export * from "./actions/limitOrderAction";

import type { Plugin } from "@moxie-protocol/core";
import { limitOrderAction } from "./actions/limitOrderAction";

export const moxieLimitOrderPlugin: Plugin = {
    name: "moxieLimitOrderPlugin",
    description: "Moxie Limit Order plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [limitOrderAction],
};

export default moxieLimitOrderPlugin;