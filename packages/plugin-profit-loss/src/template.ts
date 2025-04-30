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
Your objective is to identify the type of the request and extract important information from a give user message, and then generate a structured JSON response.

### Query types
1. User/Wallet/User&Token queries
- TYPE: "wallet" | "ens" | "moxieUserId"
- VALUE: "0x....." | "chetan.eth" | "M[number_string]"
Can also contain token address to specifically show PnL for the user & that token.

2. Criteria for Token PnL:
- TYPE: "tokenAddress"
- VALUE: "0x....."
User query can contain a 0x format token address, or $[token_symbol|token_address], you only need 0x address.

3. Criteria for Overall PnL (Best Traders):
   - TYPE: "overall"
   - VALUE: "best_traders"

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
  "chain": "base"
}
\`\`\`
Latest message: {{latest_message}}
Conversation history: {{conversation_history}}

General rules:
- if the query mentions both ENS and moxieUserId - use moxieUserId.
- if the query mentions "my PnL", or "I earned/lost" use the following UserId: {{UserId}}
- if the query mentions "my agent PnL" user the following wallet address: {{agent_wallet_address}}
`;
