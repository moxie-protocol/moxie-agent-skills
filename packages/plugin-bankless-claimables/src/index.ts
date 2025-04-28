import type { Plugin } from "@moxie-protocol/core";

import checkClaimablesAction from "./actions/checkClaimablesActions";
import explainClaimablesAction from "./actions/explainClaimablesAction";

const banklessClaimablesSkill: Plugin = {
    name: "plugin-bankless-claimables",
    description:
        "Checks connected agent wallets for available crypto airdrops, rewards, and other claimables using the Bankless API.",
    actions: [checkClaimablesAction, explainClaimablesAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default banklessClaimablesSkill;
