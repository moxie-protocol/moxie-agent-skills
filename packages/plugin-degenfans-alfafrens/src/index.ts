import type { Plugin } from "@moxie-protocol/core";

import {  stakingConsultantAction } from "./actions/stakingConsultantAction";
import { gasUsageTemplate } from "./templates";
import { gasUsageAction } from "./actions/gasUsageAction";

const degenfansAlfaFrensPlugin: Plugin = {
    name: "AlfaFrens",
    description: "AlfaFrens agent for several informations, like staking, gas usage etc.!",
    actions: [stakingConsultantAction], //gasUsageAction
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default degenfansAlfaFrensPlugin;
