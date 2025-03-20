import { ActionExample } from "@moxie-protocol/core";

export const tokenSocialSentimentExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me social sentiment for $moxie",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `
                Farcaster Sentiment: Positive
                Key Insights:
                - Technical aspects of moxie protocol receive praise from developers and researchers, particularly its security features and Layer 2 improvements
                - Concerns exist about centralization risks and long-term utility compared to existing solutions

                Most Discussed Topics: Technical innovation, governance model, long-term viability
                Notable Trends: Higher engagement on technically-focused positive posts suggests a technically literate audience with cautious optimism

                Twitter Sentiment: Positive
                Key Insights:
                - The community is bullish on $moxie, with mentions of a 10x potential, a possible Coinbase listing, and a $1B market cap.
                - Some users believe $MOXIE has actual utility compared to other meme coins, which could drive long-term value.
                - Mentions of Moxie Pass, airdrops, and fan tokens suggest strong engagement.

                Most Discussed Topics: $moxie, 10x potential, Coinbase listing, $1B market cap
                Notable Trends: Higher engagement on technically-focused positive posts suggests a technically literate audience with cautious optimism
`,
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me recent casts about $moxie",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I couldn't find any casts about $moxie",
                action: "CAST_ERROR",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me recent casts about $degen, sort by engagement",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `
                Farcaster Sentiment: Negative
                Key Insights:
                - The community is bearish on $degen, with mentions of a 10x potential, a possible Coinbase listing, and a $1B market cap.
                - Some users believe $MOXIE has actual utility compared to other meme coins, which could drive long-term value.
                - Mentions of Moxie Pass, airdrops, and fan tokens suggest strong engagement.

                Most Discussed Topics: $degen, 10x potential, Coinbase listing, $1B market cap
                Notable Trends: Higher engagement on technically-focused positive posts suggests a technically literate audience with cautious optimism

                Twitter Sentiment: Negative
                Key Insights:
                - The community is bearish on $degen, with mentions of a 10x potential, a possible Coinbase listing, and a $1B market cap.
                - Some users believe $MOXIE has actual utility compared to other meme coins, which could drive long-term value.
                - Mentions of Moxie Pass, airdrops, and fan tokens suggest strong engagement.

                Most Discussed Topics: $degen, 10x potential, Coinbase listing, $1B market cap
                Notable Trends: Higher engagement on technically-focused positive posts suggests a technically literate audience with cautious optimism

                `,
                action: "TOKEN_SOCIAL_SENTIMENT",
            },
        },
    ],
];
