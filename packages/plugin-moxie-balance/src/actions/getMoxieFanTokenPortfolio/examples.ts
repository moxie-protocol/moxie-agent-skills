import { ActionExample } from "@moxie-protocol/core";

export const fanTokenPortfolioExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me my Creator Coin portfolio",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Creator Coin Holdings:
| Creator                 | Amount    | USD Value  | % of Holdings |
|-------------------------|-----------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18      | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73    | $1.33      | 13.3%         |
| thedude (fid:13874)     | 100.00    | $1.29      | 1.3%          |
| Other Creator Coins     | -         | $7.15      | 0.7%          |

Total Creator Coin Value: $9.98

Your portfolio shows a diverse mix of Creator Coins with a total value of $9.98. The largest holdings are in nikolaiii and creator tokens, which together make up about 27.4% of your Creator Coin portfolio. You have smaller positions in other Creator Coins as well, showing a balanced approach to Creator Coin investments.`,
                action: "CREATOR_COIN_BALANCE_SUCCESS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What are my creator coin holdings?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I couldn't find any Creator Coins in the portfolio for this wallet address",
                action: "CREATOR_COIN_BALANCE_ERROR",
            },
        },
    ],
];
