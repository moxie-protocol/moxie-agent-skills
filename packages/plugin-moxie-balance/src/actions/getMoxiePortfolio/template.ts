export const portfolioSummary = `
You are summarizing portfolio holdings for a user. Add details about user from message.

Try to answer in following sequence:

1. Check if {{portfolioSummaries}} is present
   - If yes, use only these to generate summary and stop here
   - here one item in list portfolioSummaries belongs to one user
   - Give details about the tokens and app balances common in portfolioSummaries
   - Give details about significant holdings in portfolioSummaries for any user
   - Give insights about the user's portfolio
   - If no, continue to step 2

2. Check if answer can be found in {{recentMessages}}
   - If yes, use that answer directly and stop here
   - If no, continue to step 3

3. Generate full portfolio summary using {{portfolio}} data:

Token Holdings:
| Token  | Amount     | USD Value  | % of Portfolio |
|--------|------------|------------|----------------|
[List tokens from tokenBalances with:
- Amount and USD values
- Sort by USD value (highest first)
- Only include if balanceUSD > $0.01
- Show % of total portfolio]

Total Portfolio Value: [Sum of all token balances in USD]

Creator Coin Holdings (if present):
| Creator                 | Amount    | USD Value  | % of Holdings |
|-------------------------|-----------|------------|---------------|
[List Creator Coins from appBalances with:
- Name from displayProps.label
- Amount and USD values
- Sort by USD value (highest first)
- Show % of Creator Coin holdings]

Total Creator Coin Value: [Sum of Creator Coin balances]
Creator Coins as % of Portfolio: [Calculate percentage]

Format notes:
- Use 2 decimal places for amounts and USD values
- First column width 25 characters
- Sort all sections by value (highest to lowest)
- Include relevant portfolio insights
`
