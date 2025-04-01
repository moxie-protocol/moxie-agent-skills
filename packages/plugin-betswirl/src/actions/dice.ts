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
    Dice,
    DiceNumber,
    MIN_SELECTABLE_DICE_NUMBER,
    MAX_SELECTABLE_DICE_NUMBER,
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

export const DiceBetParameters = z.object({
    number: z
        .number()
        .gte(MIN_SELECTABLE_DICE_NUMBER)
        .lte(MAX_SELECTABLE_DICE_NUMBER)
        .describe("The number to bet on"),
    ...casinoBetParams,
    ...getMaxBetCountParam(CASINO_GAME_TYPE.DICE),
});
export const diceTemplate = `
Extract the following details to play on Dice:
- **betAmount** (String?): The amount to wager.
- **number** (Number?): The number to bet on. Can be from ${MIN_SELECTABLE_DICE_NUMBER} to ${MAX_SELECTABLE_DICE_NUMBER}.
- **token** (String?): The token symbol.
Where "?" indicates that the value is optional.

Provide the values in the following JSON format:
\`\`\`json
{
    "betAmount": string?,
    "number": number?,
    "token": string?
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**
\`\`\`
Bet 0.01 ETH above 44
\`\`\`

**Response 1**
\`\`\`json
{
    "betAmount": "0.01",
    "number": 44,
    "token" "ETH"
}
\`\`\`

**Message 2**
\`\`\`
Roll the dice with 0.01 ETH on 23
\`\`\`

**Response 2**
\`\`\`json
{
    "betAmount": "0.5",
    "number": 23,
    "token": "ETH",
}
\`\`\`

** Message 3 **
\`\`\`
Roll a dice for me
\`\`\`

** Response 3 **
\`\`\`json
{
    "betAmount": null,
    "number": null,
    "token": null,
}
\`\`\`

** Message 4 **
\`\`\`
I want to bet on the 8
\`\`\`

** Response 4 **
\`\`\`json
{
    "betAmount": null,
    "number": 8,
    "token": null,
}
\`\`\`

** Message 5 **
\`\`\`
I want to bet 0.01 on 8
\`\`\`

** Response 5 **
\`\`\`json
{
    "betAmount": "0.01",
    "number": 8,
    "token": null,
}
\`\`\`

** Message 6 **
\`\`\`
I want to bet my ETH on 8
\`\`\`

** Response 6 **
\`\`\`json
{
    "betAmount": null,
    "number": 8,
    "token": "ETH",
}
\`\`\`json

Here are the recent user messages for context:
{{recentMessages}}
`;
export const diceAction: Action = {
    name: "DICE",
    similes: [
        "ROLL_A_DICE",
        "DICE_ROLL",
        "BETSWIRL_DICE",
        "BET_ON_DICE",
        "BET_ON_DICE_BETSWIRL",
    ],
    description:
        "Play the BetSwirl Dice. The player is betting that the rolled number will be above this chosen number.",
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
            elizaLogger.log("Starting DICE handler...");

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
                template: diceTemplate,
            });
            const diceDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: DiceBetParameters,
            });
            const { number, betAmount, token } = diceDetails.object as {
                number: DiceNumber;
                betAmount: string;
                token: string;
            };

            // Validate face is heads or tails
            if (!number) {
                throw new Error(`No provided number`);
            }
            await callback({
                text: "Placing a Dice bet on " + number,
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
                `Rolling the dice with ${betAmount} ${selectedToken.symbol}, betting on ${number}...`
            );
            const hash = await placeBet(
                chainId,
                wallet,
                CASINO_GAME_TYPE.DICE,
                Dice.encodeInput(number),
                Dice.getMultiplier(number),
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

[🔗 Go to more details](https://www.betswirl.com/${slugById[chainId]}/casino/${CASINO_GAME_TYPE.DICE}/${bet.id})`;

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
                    text: "Bet 0.01 ETH above 35",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You Won, your Payout is 0.00003 ETH, Bet tx: 0x6ba8a0c3e861b036f052709f56412084806376fbaf24b15bce4920a8a53095af, Resolution tx hash: 0x8ed5541c45b6c7083b3e5795f52f92827748e93e6562ec126f4a1cf22b433f77",
                    action: "DICE",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Roll a dice for me",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You must specify on which number, bet amount and token symbol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet on the 8",
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
                    text: "I want to bet 0.01 on 8",
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
                    text: "I want to bet my ETH on 8",
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
