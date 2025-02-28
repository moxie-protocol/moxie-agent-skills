import type { Plugin } from "@moxie-protocol/core";
import { coinTossAction } from "./actions/coinToss";
import { getBetsAction } from "./actions/getBets";

const betswirlPlugin: Plugin = {
    name: "betswirl",
    description: "Wager on BetSwirl",
    actions: [getBetsAction, coinTossAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default betswirlPlugin;
