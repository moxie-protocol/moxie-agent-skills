import type { Plugin } from "@moxie-protocol/core";

import {  stakingConsultantAction } from "./actions/stakingConsultantAction";

const degenfansAlfaFrensPlugin: Plugin = {
    name: "AlfaFrens",
    description: "AlfaFrens staking consultant!",
    actions: [stakingConsultantAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default degenfansAlfaFrensPlugin;
