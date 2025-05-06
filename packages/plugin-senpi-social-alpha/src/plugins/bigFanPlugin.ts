import { Plugin } from "@senpi-ai/core";
import { creatorTweetSummary } from "../actions/twitterSummaryAction";
import { creatorFarcasterSummary } from "../actions/farcasterSummaryAction";
import {
    tokenSwapSummary,
    creatorCoinSwapSummary,
} from "../actions/swapSummaryAction";
import { creatorSocialSummary } from "../actions/socialSummaryAction";

export const senpiBigFanPlugin: Plugin = {
    name: "Senpi Big Fan plugin",
    description:
        "Provides insights about your favorite creators' activities, including Twitter and Farcaster posts, token swaps, and creator coin transactions",
    actions: [
        creatorTweetSummary,
        creatorFarcasterSummary,
        tokenSwapSummary,
        creatorSocialSummary,
        creatorCoinSwapSummary,
    ],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};
