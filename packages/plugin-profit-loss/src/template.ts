export const pnlTemplate = `
You are summarizing a Profit and loss - money earned or lost trading cryptocurrencies.

Most recent message: {{latestMessage}}
Message history: {{conversation}}
Criteria: {{criteria}}

Step 1: Identify which type of query the question refers to. It might be about a user, wallet, token, user or wallet & a token, or overall. Based on this follow the instructions below.

####  General  Rules
- Present the data in a table format, use the dollar sign inside the table to indicate money where needed.
- Write a quick intro about the PnL analysis. Do mention that this PnL is for all-time realized gains, from wallets trading on DEXs. The PnL amounts are indicative only.
- Agent can also be called senpi.
- When mentioning users: mention by name and link to them using the exact markdown format: @[username|user_id] format e.g. @[zoravar|M234]. If username is not available, use the exact format: @[user_id|user_id] e.g. @[M234|M234]. Do not add any extra characters such as slashes.

#### If the question is about user or wallet:
- Make sure to sum up and call out the total top 20 PnL in the beginning.

### If the question is about user or wallet for a particular token:
- Skip total PnL.
- Make sure to identify which address is wallet and which is token.

### If the question is about token PnL (e.g. who are the top traders of a token):
- Mention the token name in the introduction, skip the token name/symbol from the table. Total PnL is for top 20 wallets.

#### Required Fields in Response:
- User Name (only for token PnL)
- Token Name/Symbol
- Total Profit/Loss
- Total Buy Amount (USD)
- Total Sell Amount (USD)
- Number of Buy Transactions
- Number of Sell Transactions

## PnL data: {{pnlData}}

## Total PnL: {{totalPnl}}
`;

export const extractWalletTemplate = `
Your objective is to identify the type of the request and extract important information from a give user message, and then generate a structured JSON response.

### Query types
1. User/Wallet/User&Token queries
- TYPE: "wallet" 
- VALUE: "0x....." 

- TYPE: "ens"
- VALUE: "chetan.eth" 

- TYPE: "moxieUserId"
- VALUE: "M[number_string]" 
Can also contain token address to specifically show PnL for the user & that token.

2. Criteria for Token PnL:
- TYPE: "tokenAddress"
- VALUE: "0x....."
User query can contain a 0x format token address, or $[token_symbol|token_address](example: $[USDC|0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913]), you only need 0x address.

3. Criteria for Overall PnL (Best Traders):
   - TYPE: "overall"
   - VALUE: "best_traders"

###Timeframe Extraction
- If the query specifies "24 hours," convert it to "1d."
- If the query specifies a timeframe, format it using only days or "lifetime." Use formats like "1d", "7d", "30days" or "lifetime."

Response format example:
\`\`\`json
{
  "criteria": [
    {
      "TYPE": "[query type]",
      "VALUE": "[query value]"
    }
  ],
  "analysisType": "PROFIT",
  "maxResults": 20,
  "chain": "base",
  "timeFrame": "[formatted timeframe if applicable]"
}
\`\`\`
Latest message: {{latestMessage}}
Conversation history: {{recentMessages}}

General rules:
- if the query mentions both ENS and moxieUserId - use moxieUserId.
- if the query mentions "my PnL", or "I earned/lost" use the following UserId: {{moxieUserId}}
- if the query mentions "my agent PnL/senpi PnL" use the following wallet address: {{agentWalletAddress}}
- agent can also be called senpi.
`;
