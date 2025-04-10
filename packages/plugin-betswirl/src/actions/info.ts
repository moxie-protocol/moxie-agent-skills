import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    elizaLogger,
} from "@moxie-protocol/core";
import { getCasinoTokens } from "../providers/casinoTokens";

export const infoAction: Action = {
    name: "BETSWIRL_INFO",
    similes: [
        "WHAT_IS_BETSWIRL",
        "HOW_DOES_BETSWIRL_WORK",
        "HOW_TO_PLAY_BETSWIRL",
        "WHAT_IS_PLAY_GAMES_OF_LUCK",
        "HOW_DOES_PLAY_GAMES_OF_LUCK_WORK",
        "HOW_TO_PLAY_GAMES_OF_LUCK",
    ],
    description:
        "BetSwirl's skills offers you onchain casino games: Dice, Coin Toss and Roulette. Once you placed the bet, a randomness is drawn from Chainlink VRF and used to resolve the game, and you immediately receive your payout in your wallet if you win. If you want more details, visit https://www.betswirl.com.",
    suppressInitialMessage: true,
    validate: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State
    ) => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            const casinoTokens = await getCasinoTokens();
            const tokenSymbols = casinoTokens.map((token) => token.symbol);
            const tokenSymbolsString = tokenSymbols.join(", ");
            await callback({
                text: `Play Games Of Luck/BetSwirl Skills offers you to play onchain casino games on Base:

**🪙 Coin Toss**
- Classic heads or tails game
- Choose heads or tails
- Win if the coin lands on your chosen side

**🎲 Dice**
- 100-sided dice game
- Choose a number between 1-99
- Win if the rolled number is above your chosen number

**🎯 Roulette**
- Choose up to 36 numbers
- Win if the ball lands on any of your chosen numbers

All games use Chainlink VRF for verifiable randomness. Place bets with ${tokenSymbolsString}. Winnings are paid out instantly to your wallet.

[🎮 Start playing now](https://www.betswirl.com)`,
                action: "BETSWIRL_INFO",
            });
            return true;
        } catch (error) {
            elizaLogger.error(error);
            await callback({
                text: "Error fetching betswirl info.",
            });
            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What is BetSwirl?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "BetSwirl's skills offers you onchain casino games: Dice, Coin Toss and Roulette.",
                },
            },
        ],
    ] as ActionExample[][],
};
