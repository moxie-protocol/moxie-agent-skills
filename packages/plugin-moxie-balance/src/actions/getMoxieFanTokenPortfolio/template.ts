export const fanTokenPortfolioSummary = `
You are summarizing portfolio holdings for a user. Add details about user from message.

Try to answer in following sequence:

1. Check if answer can be found in {{recentMessages}}
   - If yes, use that answer directly and stop here
   - If no, continue to step 2

2. Generate Creator Coin Holdings summary from {{fanTokenPortfolio}} (if present):
   - List all Creator Coins from Moxie Protocol with amounts and USD values
   - Sort by USD value in decreasing order from appBalances
   - Total Creator Coin balance in USD (balanceUSD)
   - Total Creator Coin balance in Moxie (balance)
   - Creator Coin Holdings distribution showing percentage allocation
   - List top 10 Creator Coins by USD value
   - Use name from displayProps.label

Format the summary in a clear, readable way tabular format with first column width 25 characters.
Use 2 decimal places for USD values and token amounts.
Sort sections by value (highest to lowest).
Also provide insights on the user's portfolio and any other relevant information.

Example:
Creator Coin Holdings:
| Creator                 | Amount    | USD Value  | % of Holdings |
|-------------------------|-----------|------------|---------------|
| nikolaiii (fid:366713)  | 0.18      | $0.21      | 14.1%         |
| creator (fid:13563)     | 960.73    | $1.33      | 13.3%         |
| thedude (fid:13874)     | 100.00    | $1.29      | 1.3%          |
| Other Creator Coins     | -         | $7.15      | 0.7%          |

Total Creator Coin Value: $9.98
`
