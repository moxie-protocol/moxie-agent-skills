import type { Plugin } from "@moxie-protocol/core";
import { coinTossAction } from "./actions/coinToss";
import { getBetsAction } from "./actions/getBets";
import { casinoTokensProvider } from "./providers/casinoTokens";
import { casinoGamesProvider } from "./providers/casinoGames";

const betswirlPlugin: Plugin = {
    name: "betswirl",
    description: "Wager on BetSwirl",
    actions: [getBetsAction, coinTossAction],
    providers: [casinoGamesProvider, casinoTokensProvider],
    evaluators: [],
    services: [],
    clients: [],
};

export default betswirlPlugin;
