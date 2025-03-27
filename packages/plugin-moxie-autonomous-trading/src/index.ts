import type { Plugin } from "@moxie-protocol/core";
import { getAutonomousTradingRuleDetailAction, autonomousTradingAction } from "./actions";

const moxieAutonomousTradingPlugin: Plugin = {
    name: "moxieAutonomousTradingPlugin",
    description: "Execute autonomous trading actions",
    actions: [
        getAutonomousTradingRuleDetailAction,
        autonomousTradingAction
    ],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default moxieAutonomousTradingPlugin;
