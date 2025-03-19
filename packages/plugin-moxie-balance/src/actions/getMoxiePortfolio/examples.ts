import { ActionExample } from "@moxie-protocol/core";

export const portfolioExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me my portfolio balance for 0x1234567890abcdef1234567890abcdef12345678",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `## Token Holdings
| Token  | Amount     | USD Value  | % of Portfolio |
|--------|------------|------------|----------------|
| MOXIE  | 92,390.04  | $60.59     | 60.1%         |
| USDC   | 38.82      | $38.82     | 38.5%         |
| ETH    | 0.00034    | $1.14      | 1.4%          |

**Total Portfolio Value:** $100.55

## Creator Coin Holdings
| Creator Coin            | Total(MOXIE) | Locked($)  | Unlocked($) | Total($)   | % of Holdings |
|-------------------------|--------------|------------|-------------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18         | $0.10      | $0.11       | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73       | $0.66      | $0.67       | $1.33      | 13.3%         |
| thedude (fid:13874)     | 100.00       | $0.64      | $0.65       | $1.29      | 1.3%          |

**Total Creator Coin Value:** $9.98
**Creator Coins as % of Portfolio:** 9.9%

### Portfolio Insights
- Your portfolio has a good mix of tokens and Creator Coins
- MOXIE tokens make up the majority at 60.1%
- Significant USDC stablecoin position provides stability
- Creator Coins represent about 10% of total holdings
- Top Creator Coin positions in nikolaiii and creator tokens`,
                action: "PORTFOLIO_SUCCESS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's my current balance for 0xabcdef1234567890abcdef1234567890abcdef12",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "I couldn't find any Tokens in the portfolio for this wallet address",
                action: "PORTFOLIO_ERROR",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me portfolio for @[user1|M123] @[user2|M456]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Based on the holdings of user1 and user2, here is a summary of their portfolios:

## Token Holdings
Both users maintain similar token holdings:
- MOXIE tokens are the dominant asset (65-70% of portfolios)
- USDC provides stable value (28-30% allocation)
- Small ETH positions (1-4.5%)

User1's portfolio is valued at $50.00 with:
- MOXIE: 50,000.00 ($32.75)
- USDC: $15.00
- ETH: 0.00068 ($2.25)

User2's portfolio is valued at $70.00 with:
- MOXIE: 75,000.00 ($49.13)
- USDC: $20.00
- ETH: 0.00025 ($0.83)

### Portfolio Insights
- Combined portfolio value of $120.00
- Both users follow similar asset allocation strategies
- User2 has a 40% larger portfolio than user1
- Conservative stablecoin positions provide portfolio stability
- MOXIE token exposure indicates strong platform engagement`,
                action: "PORTFOLIO_MULTIPLE_SUCCESS",
            },
        },
    ],
];
