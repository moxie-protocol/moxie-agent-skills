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
    CoinToss,
    COINTOSS_FACE,
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

export const CoinTossBetParameters = z.object({
    face: z
        .nativeEnum(COINTOSS_FACE)
        .nullable()
        .describe("The face of the coin"),
    ...casinoBetParams,
    ...getMaxBetCountParam(CASINO_GAME_TYPE.COINTOSS),
    isConfirmed: z
        .boolean()
        .optional()
        .nullable()
        .describe(
            "Whether the user confirmed the bet based on historical conversation."
        ),
});
export const coinTossTemplate = `
Extract the following details to flip a coin:
- **betAmount** (String?): The amount to wager.
- **face** (String?): The side of the coin to bet on. Can be either:
  - HEADS
  - TAILS
- **token** (String?): The token symbol. Only set this if the user explicitly mentions a token (like ETH, USDC, etc.) in their message. If no token is mentioned, set to null.
- **isConfirmed** (Boolean?): Whether the bet has been confirmed based on recent messages. Default this to null if there is no confirmation nor denial given by the user.

Where "?" indicates that the value is optional.

Provide the values in the following JSON format:
\`\`\`json
{
    "betAmount": string?,
    "face": string?,
    "token": string?,
    "isConfirmed": boolean?
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "Bet 0.01 ETH on heads"
        }
    },
    {
        "user": "{{user2}}",
        "content": {
            "text": "You are trying to bet on heads with 0.01 ETH, would you like to confirm this bet?"
        }
    },
    {
        "user": "{{user1}}",
        "content": {
            "text": "Yes."
        }
    }
]
\`\`\`

**Response 1**
\`\`\`json
{
    "betAmount": "0.01",
    "face": "HEADS",
    "token": "ETH",
    "isConfirmed": true
}
\`\`\`

**Message 2**
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "Double or nothing 0.5 ETH on heads"
        }
    },
    {
        "user": "{{user2}}",
        "content": {
            "text": "You are trying to bet on heads with 0.5 ETH, would you like to confirm this bet?"
        }
    },
    {
        "user": "{{user1}}",
        "content": {
            "text": "No."
        }
    }
]
\`\`\`
**Response 2**
\`\`\`json
{
    "betAmount": "0.5",
    "face": "HEADS",
    "token": "ETH",
    "isConfirmed": false
}
\`\`\`

** Message 3 **
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "Flip a coin for me"
        }
    }
]
\`\`\`

** Response 3 **
\`\`\`json
{
    "betAmount": null,
    "face": null,
    "token": null,
    "isConfirmed": null
}
\`\`\`

** Message 4 **
\`\`\`
I want to bet on the tails side
\`\`\`

** Response 4 **
\`\`\`json
{
    "betAmount": null,
    "face": "TAILS",
    "token": null,
    "isConfirmed": null
}
\`\`\`

** Message 5 **
\`\`\`
I want to bet 0.01 on heads
\`\`\`

** Response 5 **
\`\`\`json
{
    "betAmount": "0.01",
    "face": "HEADS",
    "token": null,
    "isConfirmed": false
}
\`\`\`

** Message 6 **
\`\`\`
I want to bet my ETH on tails
\`\`\`

** Response 6 **
\`\`\`json
{
    "betAmount": null,
    "face": "TAILS",
    "token": "ETH",
    "isConfirmed": null
}
\`\`\`

** Message 7 **
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "can you place a bet on tails for coin toss with 0.0002 ETH?"
        },
        {
            "user": "{{user2}}",
            "content": {
                "text": "You are trying to bet on tails with 0.0002 ETH, would you like to confirm this bet?"
            }
        },
        {
            "user": "{{user1}}",
            "content": {
                "text": "Yes."
            }
        }
    }
]
\`\`\`

** Response 7 **
\`\`\`json
{
    "betAmount": "0.0002",
    "face": "TAILS",
    "token": "ETH",
    "isConfirmed": true
}
\`\`\`

** Message 8 **
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "can you place a bet on tails for coin toss with 0.00003 ETH?"
        }
    },
    {
        "user": "{{user2}}",
        "content": {
            "text": "You are trying to bet on tails with 0.00003 ETH, would you like to confirm this bet?"
        }
    },
    {
        "user": "{{user1}}",
        "content": {
            "text": "Yes."
        }
    }
]
\`\`\`

** Response 8 **
\`\`\`json
{
    "betAmount": "0.00003",
    "face": "TAILS",
    "token": "ETH",
    "isConfirmed": true
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
export const coinTossAction: Action = {
    name: "COIN_TOSS",
    similes: [
        "COIN_FLIP",
        "DOUBLE_OR_NOTHING",
        "TOSS_A_COIN",
        "BETSWIRL_COIN_TOSS",
        "BET_ON_HEADS",
        "BET_ON_TAILS",
        "BET_ON_COIN_FLIP",
        "BET_ON_COIN_TOSS",
        "BET_ON_HEADS_BETSWIRL",
        "BET_ON_TAILS_BETSWIRL",
        "BET_ON_CON_FLIP_BETSWIRL",
        "BET_ON_COIN_TOSS_BETSWIRL",
    ],
    description:
        "Flip a coin on BetSwirl. The player is betting that the rolled face will be the one chosen.",
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
            elizaLogger.log("Starting COIN_TOSS handler...");

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
                template: coinTossTemplate,
            });
            const coinTossDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: CoinTossBetParameters,
            });
            const { face, betAmount, token, isConfirmed } = coinTossDetails.object as {
                face: string;
                betAmount: string;
                token: string;
                isConfirmed: boolean;
            };

            // Validate face is heads or tails
            if (
                !face ||
                ![COINTOSS_FACE.HEADS, COINTOSS_FACE.TAILS].includes(
                    face as COINTOSS_FACE
                )
            ) {
                throw new Error(
                    `You must specify the face heads or tails. i.e. "Bet 0.07 ETH on heads". You'll be betting that the rolled face will be the one chosen.`
                );
            }
            // Get the bet token from the user input
            const selectedToken = await getBetToken(chainId, token);

            // Validate the bet amount
            const betAmountInWei = getBetAmountInWei(betAmount, selectedToken);
            const tokenForMoxieTerminal = formatTokenForMoxieTerminal(
                chainId,
                selectedToken
            );
            
            // if confirmation is not given yet
            if (isConfirmed === null) {
                await callback({
                    text: `You are trying to bet on ${face} with ${betAmount} ${token}. Would you like to confirm this bet?`,
                    action: "COIN_TOSS",
                });
                return true;
            // if user denied
            } else if (isConfirmed === false) {
                await callback({
                    text: `In that case, let me know anytime if you would like to proceed with the bet, change your bet, or place a new bet.`,
                });
                return true;
            }
            
            await callback({
                text: "Betting on " + face,
            });
            await callback({
                text: ` with ${betAmount} ${tokenForMoxieTerminal}...`,
            });

            elizaLogger.log(
                `Tossing ${betAmount} ${selectedToken.symbol} on ${face}...`
            );
            const hash = await placeBet(
                chainId,
                wallet,
                CASINO_GAME_TYPE.COINTOSS,
                CoinToss.encodeInput(face),
                CoinToss.getMultiplier(face),
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
Rolled face: ${bet.decodedRolled}
Payout: [${bet.formattedPayout}](${formatTxnUrl(bet.rollTxnHash, chainId)}) ${tokenForMoxieTerminal}

[🔗 Go to more details](https://www.betswirl.com/${slugById[chainId]}/casino/${CASINO_GAME_TYPE.COINTOSS}/${bet.id})`;

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
                    text: "Double 0.01 ETH on heads",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You Won, your Payout is 0.00003 ETH, Bet tx: 0x6ba8a0c3e861b036f052709f56412084806376fbaf24b15bce4920a8a53095af, Resolution tx hash: 0x8ed5541c45b6c7083b3e5795f52f92827748e93e6562ec126f4a1cf22b433f77",
                    action: "COIN_TOSS",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Flip a coin for me",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Face must be heads or tails, bet amount and token symbol",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to bet on the tails side",
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
                    text: "I want to bet 0.01 on heads",
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
                    text: "I want to bet my ETH on tails",
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
