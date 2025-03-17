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
import { MoxieUser } from "@moxie-protocol/moxie-agent-lib/src";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib/src/wallet";
import {
    CASINO_GAME_TYPE,
    slugById,
    truncate,
    formatTxnUrl,
    formatAccountUrl,
    CasinoChainId,
    fetchBets,
    Bet_OrderBy,
    OrderDirection,
} from "@betswirl/sdk-core";
import { hexAddress } from "../types";
import { getChainIdFromWallet } from "../utils/betswirl";
import { formatTokenForMoxieTerminal } from "../utils/moxie";

export const GetBetsParameters = z.object({
    bettor: z.union([hexAddress, z.literal("")]).describe("The bettor address"),
    game: z
        .union([z.nativeEnum(CASINO_GAME_TYPE), z.literal("")])
        .describe("The game to get the bets for"),
});
export const getBetsTemplate = `
Extract the following details to get the bets:
- **bettor** (String): The address of the player.
- **game** (String): The game. Can be either:
  - coin-toss
  - dice
  - roulette
  - keno

Provide the values in the following JSON format:

\`\`\`json
{
    "bettor": string,
    "game": string
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
Get bets
\`\`\`

**Response 1**

\`\`\`json
{
    "bettor": "",
    "game": ""
}
\`\`\`

**Message 2**

\`\`\`
Get dice bets
\`\`\`

**Response 2**

\`\`\`json
{
    "bettor": "",
    "game": "dice"
}
\`\`\`

**Message 3**

\`\`\`
Get dice bets of 0x057BcBF736DADD774A8A45A185c1697F4cF7517D
\`\`\`

**Response 3**

\`\`\`json
{
    "bettor": "0x057BcBF736DADD774A8A45A185c1697F4cF7517D",
    "game": "dice"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const getBetsAction: Action = {
    name: "GET_BETS",
    similes: ["RETRIEVE_BETS", "SHOW_BETS", "LAST_BETS", "GET_BETSWIRL_BETS"],
    description:
        "Get bets from BetSwirl. If no player is specified its listing the current connected player bets. If no game is specified its listing all games bets.",
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
            elizaLogger.log("Starting GET_BETS handler...");

            // Validate the chain
            const wallet = state.agentWallet as MoxieWalletClient;
            const chainId = await getChainIdFromWallet(wallet);

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }
            const context = composeContext({
                state,
                template: getBetsTemplate,
            });
            const getBetsDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: GetBetsParameters,
            });
            const { bettor, game } = getBetsDetails.object as {
                bettor: string;
                game: string;
            };

            // Send some text
            const bettorAddress = (
                bettor ? bettor : wallet.address
            ).toLowerCase() as Hex;
            const moxieUserInfo = state.moxieUserInfo as MoxieUser;
            await callback({
                text: `List of ${moxieUserInfo ? `@[${moxieUserInfo.userName}|${moxieUserInfo.id}]` : `[${truncate(bettorAddress, 10)}](${formatAccountUrl(bettorAddress, chainId)})`} bets:`,
            });

            elizaLogger.log(
                `Getting ${game ? game : "all"} bets from ${bettorAddress}...`
            );
            const bets = await getSubgraphBets(
                chainId,
                bettorAddress,
                game as CASINO_GAME_TYPE,
                process.env.BETSWIRL_THEGRAPH_KEY
            );

            let resolutionMessage: string;
            if (bets.length) {
                resolutionMessage = `
| Draw | Game | Token | Bet | Payout | Date |
| - | - | - | - | - | - |
${bets.map(
    (bet) =>
        `| ${bet.isWin ? `💰 ${bet.payoutMultiplier.toFixed(2)}x` : "💥"} | ${bet.game} | ${formatTokenForMoxieTerminal(chainId, bet.token)} | [${bet.fomattedRollTotalBetAmount}](${formatTxnUrl(bet.betTxnHash, chainId)}) | [${bet.formattedPayout}](${formatTxnUrl(bet.rollTxnHash, chainId)}) | ${bet.betDate.toUTCString()} | `
).join(`
`)}

[🔗 Go to the full bet list](https://www.betswirl.com/${slugById[chainId]}/profile/${bettorAddress}/casino)`;
            } else {
                resolutionMessage = `\nNo bets were placed! You can place coin toss, dice or roulette bets from here.`;
            }

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
                    text: "Get bets",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "A Markdown table listing all bets",
                    action: "GET_BETS",
                },
            },
        ],
    ] as ActionExample[][],
};

async function getSubgraphBets(
    chainId: CasinoChainId,
    bettor: Hex,
    game: CASINO_GAME_TYPE,
    theGraphKey?: string
) {
    try {
        const bets = await fetchBets(
            { chainId, theGraphKey },
            {
                bettor,
                game,
            },
            undefined,
            5,
            {
                key: Bet_OrderBy.BetTimestamp,
                order: OrderDirection.Desc,
            }
        );
        if (bets.error) {
            throw new Error(
                `[${bets.error.code}] Error fetching bets: ${bets.error.message}`
            );
        }
        return bets.bets;
    } catch (error) {
        throw new Error(`An error occured while getting the bet: ${error}`);
    }
}
