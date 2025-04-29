export * from "./actions/transferAction";

import type { Plugin } from "@senpi-ai/core";
import { tokenTransferAction } from "./actions/transferAction";

export const senpiTokenTransferPlugin: Plugin = {
    name: "senpiTokenTransferPlugin",
    description: "Senpi Token Transfer plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [tokenTransferAction],
};

export default senpiTokenTransferPlugin;
