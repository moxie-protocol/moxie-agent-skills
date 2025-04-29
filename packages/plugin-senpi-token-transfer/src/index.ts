export * from "./actions/transferAction";

import type { Plugin } from "@senpi-ai/core";
import { tokenTransferAction } from "./actions/transferAction";

export const moxieTokenTransferPlugin: Plugin = {
    name: "moxieTokenTransferPlugin",
    description: "Moxie Token Transfer plugin",
    providers: [],
    evaluators: [],
    services: [],
    actions: [tokenTransferAction],
};

export default moxieTokenTransferPlugin;
