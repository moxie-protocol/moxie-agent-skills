import type { Plugin } from "@moxie-protocol/core";
import { infoAction } from "./actions/info";
import { coinTossAction } from "./actions/coinToss";
import { rouletteAction } from "./actions/roulette";
import { diceAction } from "./actions/dice";
import { getBetsAction } from "./actions/getBets";
import { casinoTokensProvider } from "./providers/casinoTokens";
import { casinoGamesProvider } from "./providers/casinoGames";

const betswirlPlugin: Plugin = {
    name: "betswirl",
    description: "Wager on BetSwirl",
    actions: [
        infoAction,
        getBetsAction,
        coinTossAction,
        rouletteAction,
        diceAction,
    ],
    providers: [casinoGamesProvider, casinoTokensProvider],
    evaluators: [],
    services: [],
    clients: [],
};

export default betswirlPlugin;
