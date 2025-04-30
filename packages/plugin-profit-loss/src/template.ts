export const pnLTemplate = `
You are summarizing a Profit and loss - money earned or lost trading cryptocurrencies.

Most recent message: {{latestMessage}}
Message history: {{conversation}}
User/wallet: {{userOrWallet}}

Step 1: Identify which type of query the question refers to. It might be about a user, wallet, token, user or wallet & a token, or overall. Based on this follow the instructions below.

####  General  Rules
- Present the data in a table format, use the dollar sign to indicate money where needed.

#### If the question is about user or wallet:
- Write a quick intro about the PnL analysis.
- Make sure to sum up and call out the total PnL in the beginning.

### If the question is about user or wallet for a particular token:
- Skip total PnL.
- Make sure to identify which address is wallet and which is token.

### If the question is about token PnL (e.g. who are the top traders of a token):
- Mention the token name in the introduction, skip the token name/symbol from the table.

#### Required Fields in Response:
- Total Profit/Loss
- Token Name/Symbol
- Total Buy Amount (USD)
- Total Sell Amount (USD)
- Number of Buy Transactions
- Number of Sell Transactions

## PnL data: {{pnlData}}

## Total PnL: {{totalPnl}}
`;

export const extractWalletTemplate = `
Given the conversation history and latest message, extract the following criteria for PnL queries:

1. Criteria for User/Wallet/User&Token queries:
   - If the query is for the user's PnL, choose "moxieUserId" from the context.
   - If the query is for the agent's PnL, choose "wallet" from the context.
   - if there's ens and moxieUserId then consider moxieUserId
   - if the query contains string "M" followed by a number, then choose the value
   - TYPE: "wallet" | "ens" | "moxieUserId"
   - VALUE: "0x1c3a068430f8fe592703d07b9fd063d47bde8aba" | "chetan.eth" | "M5" | "M4"

2. Criteria for Token PnL:
   - TYPE: "tokenAddress" or token in format $[token_symbol|token_address]
   - VALUE: "0x1c3a068430f8fe592703d07b9fd063d47bde8aba" or valid ethereum token address

3. Criteria for Overall PnL (Best Traders):
   - TYPE: "overall"
   - VALUE: "best_traders"

Response format example:
\`\`\`json
{
  "criteria": [
    {
      "TYPE": "moxieUserId",
      "VALUE": "M5"
    }
  ],
  "analysisType": "PROFIT",
  "maxResults": 20,
  "chain": "base"
}
\`\`\`
Latest message: {{latestMessage}}

Conversation history:
{{conversation}}

Agent wallet address: {{agentWalletAddress}}

Moxie user id: {{moxieUserId}}
`;
