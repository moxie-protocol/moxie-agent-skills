const commonTokenOutputTemplate = `
| Token | 'user1' (Amount) | 'user2' (Amount) |  'user1' (USD) |  'user2' (USD) |
|-------|--------------|---------------|----------------|----------------|
[For each row in filteredCommonFanTokenHoldings:
- Show row.displayLabel in the first column.
- Show row[user1].amount in the second column.
- Show row[user2].amount in the third column.
- Show row[user1].dollarValue in the fourth column.
- Show row[user2].dollarValue in the fifth column.
- similar to this build column for all users in filteredCommonFanTokenHoldings
]
`
const creatorCoinAddressesTemplate = `
<!-- ## Creator Coin Contract Addresses -->

| Creator Coin | Contract Address |
|--------------|------------------|
[For each PortfolioInfo in fanTokenPortfolio:
- Use fanTokenName or fanTokenSymbol in the first column.
- Show fanTokenAddress in 'Contract Address' column.
- Add all the creator coins from 'Creator Coin Holdings' table.
- Show this table in markdown comments]

sample output for '## Creator Coin Contract Addresses'

<!-- '## Creator Coin Contract Addresses
| Creator Coin | Contract Address                           |
|--------------|--------------------------------------------|
| FANCOIN      | 0x1a2b3c4d5e6f7890abcdef1234567890abcdef12 |
-->
`
export const fanTokenPortfolioSummary = `
You are summarizing portfolio holdings for a user. Add details about user from message.

Try to answer in the following sequence:

1. Check if {{portfolioSummaries}} is present answer from these details and stop here, Try to answer the question asked in {{message}} with these details:
   - If yes, use only these to generate the summary and stop here.
   - Here, one item in the list portfolioSummaries belongs to one user.
   - Give details about the app balances common in portfolioSummaries as "Creator Coin Holdings" in tabular form similar to # Creator Coin Holdings.
   - Give details about common holdings from {{commonHoldings}} in tabular form, use displayLabel in the first column as "Creator Coin" and dont show separate 'displayLabel' column, use ${commonTokenOutputTemplate} table format for this, show upto 10 common holdings for each unless asked for more in {{message}}.
   - Give details about significant holdings in portfolioSummaries for any user.
   - Give insights about the user's portfolio.
   - Start the response with a summary of the users' holdings, such as "The portfolio analysis for the users shows that...".
   - Format the entire response in markdown.
   - show ${creatorCoinAddressesTemplate} in markdown comments.
   - If the answer can be found here, stop here, or else go to step 2.
2. Generate Creator Coin Holdings summary from {{fanTokenPortfolio}} (if present), this data belongs to {{truncatedMoxieUserInfo}}. Try to answer the question asked in {{message}} with these details:

## Creator Coin Holdings - Top [number of holdings shown in the table] by value

| Creator Coin | Amount | Total(MOXIE) | Locked($) | Unlocked($) | Total($) | % of Holdings |
|--------------|--------|--------------|-----------|-------------|----------|---------------|
[For each PortfolioInfo in fanTokenPortfolio:
- skip creating table in response if fanTokenPortfolio is empty or undefined
- Use displayLabel in the first column.
- Show totalTvl for Total(MOXIE).
- Show lockedTvlInUSD for Locked($).
- Show unlockedTvlInUSD for Unlocked($).
- Show totalAmount for Amount.
- Show totalTvlInUSD for Total($).
- Show holdingPercentage for % of Holdings.
- skip Locked($) and Unlocked($) columns untill asked in {{message}}
- Sort by totalTvlInUSD descending, include all creator coins with non-zero totalTvlInUSD in the list for building response.
- Limit to top 10 holdings ordered by totalTvlInUSD descending or more if asked in {{message}}.
- Add addresses for these creator coins in 'Creator Coin Contract Addresses' table.
- Format numbers with 2 decimal places.]

**Total Creator Coin Value**: [ {{totalCreatorCoinValue}} ]
**Associated Wallet Addresses**: [{{fanTokenWalletAddresses}}] (skip if {{fanTokenWalletAddresses}} is empty)

## Portfolio Insights
- Identify largest holdings by value.
- Note distribution between locked and unlocked tokens.
- Calculate % of portfolio in top holdings.
- Highlight any notable concentrations or diversification.
- Format all output in markdown.

${creatorCoinAddressesTemplate}


If the answer can be found here, stop here, or else go to step 3.

3. Check if the answer can be found in {{recentMessages}}:
   - If yes, use that answer directly in markdown format and stop here.

`