import type { Plugin } from "@senpi-ai/core";
import { transferAction } from "./actions/transferAction";
import { balanceAction } from "./actions/balanceAction";

const samplePlugin: Plugin = {
    name: "sample",
    description: "Execute sample onchain actions",
    actions: [balanceAction, transferAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default samplePlugin;
