import { ActionExample } from "@senpi-ai/core";

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
| Creator Coin            | Total(MOXIE) | Locked($)  | Unlocked($) | Total($)   | % of Holdings |
|-------------------------|--------------|------------|-------------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18         | $0.10      | $0.11       | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73       | $0.63      | $0.70       | $1.33      | 13.3%         |
| thedude (fid:13874)     | 100.00       | $0.59      | $0.70       | $1.29      | 1.3%          |
| Other Creator Coins     | -            | $3.15      | $4.00       | $7.15      | 71.3%         |

Total Creator Coin Value: $9.98

Portfolio Insights:
- Largest holding is nikolaiii at 14.1% of portfolio
- Nearly even split between locked and unlocked tokens
- Top 3 holdings represent 28.7% of total portfolio value
- Well diversified with significant allocation to various creator coins`,
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
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me Creator Coin Holdings for @[user1|M123] @[user2|M456]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Based on the holdings of user1 and user2:

Creator Coin Holdings for user1:
| Creator Coin            | Total(MOXIE) | Locked($)  | Unlocked($) | Total($)   | % of Holdings |
|-------------------------|--------------|------------|-------------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18         | $0.10      | $0.11       | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73       | $0.63      | $0.70       | $1.33      | 13.3%         |
| Other Creator Coins     | -            | $1.46      | $2.00       | $3.46      | 72.6%         |

Total Creator Coin Value: $5.00

Creator Coin Holdings for user2:
| Creator Coin            | Total(MOXIE) | Locked($)  | Unlocked($) | Total($)   | % of Holdings |
|-------------------------|--------------|------------|-------------|------------|---------------|
| nikolaiii (fid:366713)  | 0.36         | $0.20      | $0.22       | $0.42      | 14.1%         |
| creator (fid:13563)     | 1920.46      | $1.26      | $1.40       | $2.66      | 13.3%         |
| Other Creator Coins     | -            | $2.92      | $4.00       | $6.92      | 72.6%         |

Total Creator Coin Value: $10.00

Common Holdings:
- Both users hold nikolaiii and creator tokens
- Similar percentage allocation across holdings
- Combined Creator Coin value: $15.00

Portfolio Insights:
- user2 has 2x larger Creator Coin portfolio value
- Both maintain similar investment strategies with matching allocations
- Both portfolios show balanced distribution between locked and unlocked tokens`,
                action: "CREATOR_COIN_BALANCE_MULTIPLE_SUCCESS",
            },
        },
    ],
];
