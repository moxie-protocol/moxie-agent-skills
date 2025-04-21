export const walletPnLTemplate = `
- Current Time: {{currentDate}}

If the question is about wallet PnL or profitable/loss-making traders, follow these instructions:

## Wallet/Trader PnL Analysis:
{{pnlData}}

#### General Guidelines:
- Analysis is based on Base chain transactions only
- Add a header indicating the type of analysis (individual wallet/trader or trader rankings)
- Present data in a clear, tabular format with all key metrics
- Maximum of 15 traders shown in any ranking list

#### Required Fields in Response:
For each wallet/trader:
- Wallet Address/User ID
- Total Buy Amount (USD)
- Total Sell Amount (USD)
- Average Buy Price
- Average Sell Price
- Total Profit/Loss
- Number of Buy Transactions
- Number of Sell Transactions

#### Response Format:
For Individual Wallets/Traders:
"Analysis for {{walletAddress/userId}}:
Buy Amount: $X
Sell Amount: $Y
Avg Buy Price: $B
Avg Sell Price: $S
Total P/L: $Z
Buy Transactions: N
Sell Transactions: M"

For Trader Rankings:
"Top Traders on Base:
1. @[username|id]
   - Buy Amount: $X
   - Sell Amount: $Y
   - P/L: $Z
   - Avg Buy: $B
   - Avg Sell: $S
   - Transactions: N buys, M sells

2. @[username|id]
   [same format...]"

For Token-Specific Analysis:
"Traders for token {{address}}:
[same format as above, filtered for specific token]"

**Limitations**
- Analysis limited to Base chain transactions
- Maximum 15 traders in rankings
- Historical data includes all-time transactions
`;

export const extractWalletTemplate = `
Given the conversation history and latest message, extract:

1. Wallet addresses (if any) in the format: ["0x...", "0x..."]
2. Moxie User IDs (if any) in the format: ["M1", "M2", ...]
3. Token addresses (if any) in the format: ["0x...", "0x..."]
4. Analysis type: "WALLET_PNL" | "PROFITABLE_TRADERS" | "LOSS_MAKING_TRADERS" | "TOKEN_TRADERS"

Response format:
{
  "walletAddresses": [],
  "moxieUserIds": [],
  "tokenAddresses": [],
  "analysisType": "",
  "maxResults": 15,
  "chain": "base"
}

Latest message: {{latestMessage}}
Conversation history:
{{conversation}}
`;


