import { z } from "zod";
import {
    CASINO_GAME_TYPE,
    MAX_SELECTABLE_DICE_NUMBER,
    MAX_SELECTABLE_ROULETTE_NUMBER,
    MIN_SELECTABLE_DICE_NUMBER,
    MIN_SELECTABLE_ROULETTE_NUMBER,
    maxGameBetCountByType,
} from "@betswirl/sdk-core";

export const hexAddress = z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "The address must be a valid EVM address");

export const casinoBetParams = {
    betAmount: z.string().describe("The bet amount"),
    token: z
        .string()
        .describe("Token symbol")
        .optional()
        .describe("The token to bet with"),
    stopGain: z
        .string()
        .optional()
        .describe("The profit amount to stop betting"),
    stopLoss: z.string().optional().describe("The loss amount to stop betting"),
    receiver: hexAddress.optional().describe("The payout receiver address"),
};

export function getMaxBetCountParam(game: CASINO_GAME_TYPE) {
    return {
        betCount: z
            .number()
            .positive()
            .max(maxGameBetCountByType[game])
            .default(1)
            .optional()
            .describe("The number of bets to place"),
    };
}

export const DiceBetParameters = z.object({
    cap: z
        .number()
        .positive()
        .min(MIN_SELECTABLE_DICE_NUMBER)
        .max(MAX_SELECTABLE_DICE_NUMBER)
        .describe("The number above which you win"),
    ...casinoBetParams,
    ...getMaxBetCountParam(CASINO_GAME_TYPE.DICE),
});
export const RouletteBetParameters = z.object({
    numbers: z
        .number()
        .positive()
        .min(MIN_SELECTABLE_ROULETTE_NUMBER)
        .max(MAX_SELECTABLE_ROULETTE_NUMBER)
        .array()
        .describe("The roulette numbers"),
    ...casinoBetParams,
    ...getMaxBetCountParam(CASINO_GAME_TYPE.ROULETTE),
});
