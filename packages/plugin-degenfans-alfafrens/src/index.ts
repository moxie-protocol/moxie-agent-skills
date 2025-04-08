import type { Plugin } from "@moxie-protocol/core";

import {  stakingConsultantAction } from "./actions/stakingConsultantAction";
import { gasUsageTemplate } from "./templates";
import { gasUsageAction } from "./actions/gasUsageAction";
import { infoAction } from "./actions/infoAction";

const degenfansAlfaFrensPlugin: Plugin = {
    name: "AlfaFrens",
    description: "AlfaFrens agent for several informations, like staking, gas usage etc.!",
    actions: [stakingConsultantAction,infoAction], //gasUsageAction
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default degenfansAlfaFrensPlugin;
