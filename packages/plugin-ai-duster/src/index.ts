import type { Plugin } from "@moxie-protocol/core";
import { dustWalletAction } from "./actions/dustWalletAction";
import { explainAiDustingAction } from "./actions/explainAiDustingAction";

const aiDusterPlugin: Plugin = {
    name: "AI Duster",
    description:
        "Dust low-value tokens into ETH using your Moxie agent wallet.",
    actions: [dustWalletAction, explainAiDustingAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default aiDusterPlugin;
