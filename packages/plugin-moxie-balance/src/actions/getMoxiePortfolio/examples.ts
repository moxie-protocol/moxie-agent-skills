import { ActionExample } from "@elizaos/core";

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
                text: `Token Holdings:
| Token  | Amount     | USD Value  | % of Portfolio |
|--------|------------|------------|----------------|
| MOXIE  | 92,390.04  | $60.59     | 60.1%         |
| USDC   | 38.82      | $38.82     | 38.5%         |
| ETH    | 0.00034    | $1.14      | 1.4%          |

Total Portfolio Value: $100.55

Creator Coin Holdings:
| Creator                 | Amount    | USD Value  | % of Holdings |
|-------------------------|-----------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18      | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73    | $1.33      | 13.3%         |
| thedude (fid:13874)     | 100.00    | $1.29      | 1.3%          |
| Other Creator Coins     | -         | $7.15      | 0.7%          |

Total Creator Coin Value: $9.98
Creator Coins as % of Portfolio: 9.9%

Your portfolio shows a diverse mix of tokens and Creator Coins with a total value of $100.55. The majority is in MOXIE tokens (60.1%) and USDC (38.5%), with a small ETH position. You also have Creator Coin holdings worth $9.98, representing 9.9% of your total portfolio. The largest Creator Coin positions are in nikolaiii and creator tokens.`,
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
                text: "I couldn't find any Tokens in the portfolio",
                action: "PORTFOLIO_ERROR",
            },
        },
    ],
];
