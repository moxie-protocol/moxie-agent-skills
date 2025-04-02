import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
} from "@moxie-protocol/core";

export const infoAction: Action = {
    name: "BETSWIRL_INFO",
    similes: [
        "WHAT_IS_BETSWIRL",
        "HOW_DOES_BETSWIRL_WORK",
        "HOW_TO_PLAY_BETSWIRL",
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
        await callback({
            text: `BetSwirl's skills offers you onchain casino games: Dice, Coin Toss and Roulette.`,
            action: "BETSWIRL_INFO",
        });
        return true;
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
