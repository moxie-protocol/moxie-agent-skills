import type { Plugin } from "@moxie-protocol/core";
import { transferAction } from "./actions/transferAction";

const samplePlugin: Plugin = {
    name: "sample",
    description: "Execute sample onchain actions",
    actions: [transferAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default samplePlugin;
