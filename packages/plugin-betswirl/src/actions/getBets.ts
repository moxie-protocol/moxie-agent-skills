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
import { MoxieWalletClient } from "@moxie-protocol/moxie-lib/src/wallet";
import { MoxieUser } from "@moxie-protocol/moxie-lib";
import { getBetsTemplate } from "../templates";
import { GetBetsParameters } from "../types";
import { type Hex } from "viem";
import {
    CASINO_GAME_TYPE,
    CasinoChainId,
    casinoChainIds,
    casinoChainById,
    slugById,
    truncate,
    formatTxnUrl,
    formatAccountUrl,
    Token,
    CasinoChain,
} from "@betswirl/sdk-core";
import { getTokens, getBets } from "../utils/betswirl";

export const getBetsAction: Action = {
    name: "GET_BETS",
    similes: ["RETRIEVE_BETS", "SHOW_BETS", "LAST_BETS"],
    description: "Get bets",
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

            const coinTossDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: GetBetsParameters,
            });

            // Validate the chain
            const wallet = state.agentWallet as MoxieWalletClient;
            const chainId = Number(
                (await wallet.wallet.provider.getNetwork()).chainId
            ) as CasinoChainId;
            if (!casinoChainIds.includes(chainId)) {
                throw new Error(
                    `The chain id must be one of ${casinoChainIds.join(", ")}`
                );
            }

            // Validates the inputs
            const {
                bettor,
                game,
                token: tokenSymbol,
            } = coinTossDetails.object as {
                bettor: string;
                game: string;
                token: string;
            };
            // Validate the token
            let token: Token;
            if (tokenSymbol) {
                const tokens = await getTokens(
                    chainId,
                    process.env.BETSWIRL_THEGRAPH_KEY
                );
                token = tokens.find(
                    (token) => token.symbol === tokenSymbol.toUpperCase()
                );
                if (!token) {
                    throw new Error(
                        `The token must be one of ${tokens.map((token) => token.symbol).join(", ")}`
                    );
                }
            }

            const bettorAddress = (
                bettor ? bettor : wallet.address
            ).toLowerCase() as Hex;

            elizaLogger.log(
                `Getting ${game ? game : "all"} ${token ? token.symbol : ""} bets from ${bettorAddress}...`
            );

            const bets = await getBets(
                chainId,
                bettorAddress,
                game as CASINO_GAME_TYPE,
                token,
                process.env.BETSWIRL_THEGRAPH_KEY
            );

            const moxieUserInfo = state.moxieUserInfo as MoxieUser;
            const casinoChain = casinoChainById[chainId];
            let resolutionMessage: string;
            if (bets.length) {
                resolutionMessage = `${token ? formatTokenForMoxieTerminal(token, casinoChain) : "All"} bets of ${moxieUserInfo ? `@[${moxieUserInfo.userName}|${moxieUserInfo.id}]` : `[${truncate(bettorAddress, 10)}](${formatAccountUrl(bettorAddress, chainId)})`}:
| Draw | Game | Token | Bet | Payout | Date |
| - | - | - | - | - | - |
${bets.map(
    (bet) =>
        `| ${bet.isWin ? `💰 ${bet.payoutMultiplier.toFixed(2)}x` : "💥"} | ${bet.game} | ${formatTokenForMoxieTerminal(bet.token, casinoChain)} | [${bet.fomattedRollTotalBetAmount}](${formatTxnUrl(bet.betTxnHash, chainId)}) | [${bet.formattedPayout}](${formatTxnUrl(bet.rollTxnHash, chainId)}) | ${bet.betDate.toUTCString()} | `
).join(`
`)}

[🔗 Go to the full bet list](https://www.betswirl.com/${slugById[chainId]}/profile/${bettorAddress}/casino)`;
            } else {
                resolutionMessage = `${moxieUserInfo ? `@[${moxieUserInfo.userName}|${moxieUserInfo.id}]` : `[${truncate(bettorAddress, 10)}](${formatAccountUrl(bettorAddress, chainId)})`} hasn’t bet yet ${token ? "on " + formatTokenForMoxieTerminal(token, casinoChain) : ""}!`;
            }

            elizaLogger.success(resolutionMessage);
            await callback({
                text: resolutionMessage,
            });
        } catch (error) {
            elizaLogger.error(error.message);
            await callback({
                text: error.message,
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

function formatTokenForMoxieTerminal(token: Token, casinoChain: CasinoChain) {
    return token.symbol === casinoChain.viemChain.nativeCurrency.symbol
        ? token.symbol
        : `$[${token.symbol}\\|${token.address}]`;
}
