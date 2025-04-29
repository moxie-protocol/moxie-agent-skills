import type { Plugin } from "@senpi-ai/core";
import {
    getAutonomousTradingRuleDetailAction,
    autonomousTradingAction,
} from "./actions";

const senpiAutonomousTradingPlugin: Plugin = {
    name: "senpiAutonomousTradingPlugin",
    description: "Execute autonomous trading actions",
    actions: [getAutonomousTradingRuleDetailAction, autonomousTradingAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default senpiAutonomousTradingPlugin;
