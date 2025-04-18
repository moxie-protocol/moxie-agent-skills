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
                text: `BetSwirl Skills offers you to play onchain casino games on Base:

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

🎮 Start playing now by prompting:
- "Bet 0.01 ETH on heads" to flip a coin
- "Bet 0.01 ETH above 44" to roll a dice
- "Bet 0.01 ETH on 8, 11, 3, and 9" to spin a roulette
- "Get bets" to list your bets`,
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
                    text: "How does the BetSwirl Skill works?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `BetSwirl's skills offers you onchain casino games: Dice, Coin Toss and Roulette, on which you can bet tokens and earn tokens.
When winning your payout, tokens are transferred to your account automatically so you don't have to withdraw (it's self-custodial).

Here are the commands:
- You can flip a coin with a prompt like "Bet 0.01 ETH on heads" where you specify the bet amount, token, and face of the coin to bet on, the rolled face should be the same than chosen to win.
- You can roll a dice with a prompt like "Bet 0.01 ETH above 44" where you specify the bet amount, token, and number to bet on, the rolled number should be above this chosen number to win.
- You can spin a roulette with a prompt like "Bet 0.01 ETH on 8, 11, 3, and 9" where you specify the bet amount, token, and numbers to bet on, the rolled number should be one of the chosen numbers to win.
- You can list your bets with a prompt like "Get bets" where you could specify also the game (dice, coin toss, or roulette).`,
                },
            },
        ],
    ] as ActionExample[][],
};
