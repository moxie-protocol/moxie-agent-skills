import { z } from "zod";
import { type Hex } from "viem";
import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
    type ActionExample,
    composeContext,
    generateObject,
    ModelClass,
} from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib/src/wallet";
import {
    CASINO_GAME_TYPE,
    Roulette,
    RouletteNumber,
    MIN_SELECTABLE_ROULETTE_NUMBER,
    MAX_SELECTABLE_ROULETTE_NUMBER,
    slugById,
    formatTxnUrl,
} from "@betswirl/sdk-core";
import { casinoBetParams, getMaxBetCountParam } from "../types";
import {
    getChainIdFromWallet,
    getBetToken,
    placeBet,
    getBet,
    getBetAmountInWei,
} from "../utils/betswirl";
import { formatTokenForMoxieTerminal } from "../utils/moxie";

export const RouletteBetParameters = z.object({
    numbers: z
        .number()
        .gte(MIN_SELECTABLE_ROULETTE_NUMBER)
        .lte(MAX_SELECTABLE_ROULETTE_NUMBER)
        .array()
        .min(1)
        .max(MAX_SELECTABLE_ROULETTE_NUMBER)
        .nullable()
        .describe("The numbers to bet on"),
    ...casinoBetParams,
    ...getMaxBetCountParam(CASINO_GAME_TYPE.ROULETTE),
});
export const rouletteTemplate = `
Extract the following details to play on Roulette:
- **betAmount** (String?): The amount to wager.
- **numbers** (Array<number>?): The numbers to bet on. Can be several unique numbers from ${MIN_SELECTABLE_ROULETTE_NUMBER} to ${MAX_SELECTABLE_ROULETTE_NUMBER}.
- **token** (String?): The token symbol.
Where "?" indicates that the value is optional.

Provide the values in the following JSON format:
\`\`\`json
{
    "betAmount": string?,
    "numbers": Array<number>?,
    "token": string?
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**
\`\`\`
Bet 0.01 ETH on 3,6,8 and 10
\`\`\`

**Response 1**
\`\`\`json
{
    "betAmount": "0.01",
    "numbers": [3, 6, 8, 10],
    "token" "ETH"
}
\`\`\`

**Message 2**
\`\`\`
Bet 0.01 ETH on 8 11 3 9
\`\`\`

**Response 2**
\`\`\`json
{
    "betAmount": "0.5",
    "numbers": [8, 11, 3, 9],
    "token": "ETH",
}
\`\`\`

** Message 3 **
\`\`\`
Spin a roulette for me
\`\`\`

** Response 3 **
\`\`\`json
{
    "betAmount": null,
    "numbers": null,
    "token": null,
}
\`\`\`

** Message 4 **
\`\`\`
I want to bet on the 8, 5, and 26
\`\`\`

** Response 4 **
\`\`\`json
{
    "betAmount": null,
    "numbers": [8, 5, 26],
    "token": null,
}
\`\`\`

** Message 5 **
\`\`\`
I want to bet 0.01 on 8, 5, and 26
\`\`\`

** Response 5 **
\`\`\`json
{
    "betAmount": "0.01",
    "numbers": [8, 5, 26],
    "token": null,
}
\`\`\`

** Message 6 **
\`\`\`
I want to bet my ETH on 8, 5, 26
\`\`\`

** Response 6 **
\`\`\`json
{
    "betAmount": null,
    "numbers": [8, 5, 26],
    "token": "ETH",
}
\`\`\`json

Here are the recent user messages for context:
{{recentMessages}}
`;
export const rouletteAction: Action = {
    name: "ROULETTE",
    similes: [
        "SPIN_A_ROULETTE",
        "BETSWIRL_ROULETTE",
        "BET_ON_ROULETTE",
        "BET_ON_ROULETTE_BETSWIRL",
    ],
    description:
        "Play the BetSwirl Roulette. The player is betting that the rolled number will be one of the chosen numbers.",
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
            elizaLogger.log("Starting ROULETTE handler...");

            // Validate the chain
            const wallet = state.moxieWalletClient as MoxieWalletClient;
            const chainId = await getChainIdFromWallet();

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }
            const context = composeContext({
                state,
                template: rouletteTemplate,
            });
            const rouletteDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: RouletteBetParameters,
            });
            const { numbers, betAmount, token } = rouletteDetails.object as {
                numbers: Array<RouletteNumber>;
                betAmount: string;
                token: string;
            };

            // Validate face is heads or tails
            if (!numbers || !numbers.length) {
                throw new Error(`No provided numbers`);
            }
            const formattedNumbers = numbers.join(", ");
            await callback({
                text: "Placing a Roulette bet on " + formattedNumbers,
            });

            // Get the bet token from the user input
            const selectedToken = await getBetToken(chainId, token);

            // Validate the bet amount
            const betAmountInWei = getBetAmountInWei(betAmount, selectedToken);
            const tokenForMoxieTerminal = formatTokenForMoxieTerminal(
                chainId,
                selectedToken
            );
            await callback({
                text: ` with ${betAmount} ${tokenForMoxieTerminal}...`,
            });

            elizaLogger.log(
                `Spinning with ${betAmount} ${selectedToken.symbol}, betting on ${formattedNumbers}...`
            );
            const hash = await placeBet(
                chainId,
                wallet,
                CASINO_GAME_TYPE.ROULETTE,
                Roulette.encodeInput(numbers),
                Roulette.getMultiplier(numbers),
                {
                    betAmount: betAmountInWei,
                    betToken: selectedToken,
                    betCount: 1,
                    receiver: wallet.address as Hex,
                    stopGain: 0n,
                    stopLoss: 0n,
                }
            );
            await callback({
                text: ` [placed!](${formatTxnUrl(hash, chainId)}), now rolling...`,
            });

            const bet = await getBet(
                chainId,
                hash,
                process.env.BETSWIRL_THEGRAPH_KEY
            );
            const resolutionMessage = `
You **${bet.isWin ? "Won" : "Lost"} ${bet.isWin ? `💰 ${bet.formattedPayoutMultiplier}x` : "💥"}**,
Rolled number: ${bet.decodedRolled}
Payout: [${bet.formattedPayout}](${formatTxnUrl(bet.rollTxnHash, chainId)}) ${tokenForMoxieTerminal}

[🔗 Go to more details](https://www.betswirl.com/${slugById[chainId]}/casino/${CASINO_GAME_TYPE.ROULETTE}/${bet.id})`;

            elizaLogger.success(resolutionMessage);
            await callback({
                text: resolutionMessage,
            });
        } catch (error) {
            elizaLogger.error(error.message);
            await callback({
                text: " Error: " + error.message,
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Bet 0.01 ETH on 5, 7, 3, 34",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You Won, your Payout is 0.00003 ETH, Bet tx: 0x6ba8a0c3e861b036f052709f56412084806376fbaf24b15bce4920a8a53095af, Resolution tx hash: 0x8ed5541c45b6c7083b3e5795f52f92827748e93e6562ec126f4a1cf22b433f77",
                    action: "ROULETTE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Spin a roulette for me",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You must specify on which number(s), bet amount and token symbol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet on the 8, 5, and 26",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You must specify the bet amount and token symbol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet 0.01 on 8, 5, and 26",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You must specify the token symbol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet my ETH on 8, 5, and 26",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You must specify the bet amount",
                },
            },
        ],
    ] as ActionExample[][],
};
