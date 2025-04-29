import { Plugin } from "@senpi-ai/core";
import getTokenSocialSentiment from "./actions/getTokenSocialSentiment";
export const moxieTokensSocialSentimentPlugin: Plugin = {
    name: "Token social sentiment Plugin",
    description:
        "Gives social sentiment for any ERC20 token from Farcaster and Twitter",
    actions: [getTokenSocialSentiment],
    evaluators: [],
    providers: [],
};

export default moxieTokensSocialSentimentPlugin;
