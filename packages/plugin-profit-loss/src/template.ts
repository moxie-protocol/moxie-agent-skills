export const pnLTemplate = `
You are summarizing a Profit and loss - money earned or lost trading cryptocurrencies.

Most recent message: {{latestMessage}}
Message history: {{conversation}}
User/wallet: {{userOrWallet}}

Step 1: Identify which type of query the question refers to. It might be about a user, wallet, token, user or wallet & a token, or overall. Based on this follow the instructions below.

#### If the question is about user or wallet:
- Write a quick intro about the PnL analysis.
- Make sure to sum up and call out the total PnL in the beginning.
- Filter to the most recent 15 token trades (based on last_sale_time)
- Present the data in a table format, use the dollar sign to indicate money where needed.

### If the question is about user or wallet for a particular token:
- Present the data in a table format, use the dollar sign to indicate money where needed.
- Skip total PnL.
- Make sure to identify which address is wallet and which is token.

### If the question is about token PnL (e.g. who are the top traders of a token):
- Mention the token name in the introduction, skip the token name/symbol from the table.
- Present the data in a table format, use the dollar sign to indicate money where needed.
- Filter to the most most positive PnL 15 wallets (based on last_sale_time)
- Present the data in a table format, use the dollar sign to indicate money where needed.

#### Required Fields in Response:
- Token Name/Symbol
- Total Buy Amount (USD)
- Total Sell Amount (USD)
- Total Profit/Loss
- Number of Buy Transactions
- Number of Sell Transactions

## PnL data: {{pnlData}}
`;

export const extractWalletTemplate = `
Given the conversation history and latest message, extract:
1. Wallet addresses (if any) in the format: ENS or base names in format ["abc.eth", "abc.base.eth"] or valid ethereum address
2. Moxie User IDs (if any) in the format: @[username|userId] or userId extract userId from it
3. Token addresses (if any) in the format: $[token_symbol|token_address] or valid ethereum address
4. Analysis type: “USER_PNL” | “WALLET_PNL” | “PROFITABLE_TRADERS” | “LOSS_MAKING_TRADERS” | “TOKEN_TRADERS”
Response format:
{
  “walletAddresses”: [],
  “moxieUserIds”: [],
  “tokenAddresses”: [],
  “analysisType”: “”,
  “maxResults”: 15,
  “chain”: “base”
}

Latest message: {{latestMessage}}
Conversation history:
{{conversation}}
`;
