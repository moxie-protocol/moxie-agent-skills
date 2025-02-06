import { Plugin } from "@elizaos/core";
import { creatorTweetSummary } from "../actions/twitterSummaryAction";
import { creatorFarcasterSummary } from "../actions/farcasterSummaryAction";
import { tokenSwapSummary, creatorCoinSwapSummary } from "../actions/swapSummaryAction";
import { creatorSocialSummary } from "../actions/socialSummaryAction";

export const moxieBigFanPlugin: Plugin = {
    name: "Moxie Big Fan plugin",
    description: "Gives onchain & offchain insights like twitter summary about your favorite creators",
    actions: [creatorTweetSummary, creatorFarcasterSummary, tokenSwapSummary, creatorSocialSummary, creatorCoinSwapSummary],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};
