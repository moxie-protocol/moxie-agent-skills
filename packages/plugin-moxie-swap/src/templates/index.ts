export const swapTemplate = `Chain will always be base
Swap doesn't require user confirmation they have approved it already don't ask for confirmation again
IMPORTANT: STRICTLY use ONLY most recent message from recent conversations with source as "direct" for extracting the data. If any required information is missing, set those fields to null
If someone wants to swap tokens we set the sellAmount if someone wants to purchase token we set the buyAmount
Extract:
- Which token the user wants to sell (sellToken) If sellToken is not specified assume ETH
- Which token the user wants to buy (buyToken)
- How much they want to sell (sellAmount) If amount is not specified, return null for sellAmount
- How much they to buy (buyAmount) If amount is not specified, return null for buyAmount

For example:
"I want to convert 5 ETH to MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": "5", "buyAmount": null, "isUSDTransfer: false }
"I want to buy 10 MOXIE with ETH" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: false }
"I want to buy 10 MOXIE -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: false }
"I want to buy 20 0x4ed4e862860bed51a9570b96d89af5e1b0efefed -> { "sellToken": "ETH", "buyToken": "0x4ed4e862860bed51a9570b96d89af5e1b0efefed", "sellAmount": null, "buyAmount": "20",  "isUSDTransfer: false }
"I want to buy 5 0x4ed4e862860bed51a9570b96d89af5e1b0efefed -> { "sellToken": "ETH", "buyToken": "0x4ed4e862860bed51a9570b96d89af5e1b0efefed", "sellAmount": null, "buyAmount": "5",  "isUSDTransfer: false }
"I want to buy 10 dollars worth of MOXIE -> { "sellToken": "USDC", "buyToken": "MOXIE", "sellAmount": "10", "buyAmount": null,  "isUSDTransfer: false }
"Convert 100 ETH to MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": "100", "buyAmount": null,  "isUSDTransfer: false }
"Convert 0.003 ETH to MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": "0.003", "buyAmount": null,  "isUSDTransfer: false }
"Convert 0.003 ETH to 0x4ed4e862860bed51a9570b96d89af5e1b0efefed" -> { "sellToken": "ETH", "buyToken": "0x4ed4e862860bed51a9570b96d89af5e1b0efefed", "sellAmount": "0.003", "buyAmount": null,  "isUSDTransfer: false }
"I want to buy 10 dollars of MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: true}
"I want to buy 10 USD of MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: true}
"I want to buy 10 USDC of MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: true}
"I want to buy 10 USDT of MOXIE" -> { "sellToken": "ETH", "buyToken": "MOXIE", "sellAmount": null, "buyAmount": "10", "isUSDTransfer: true}
Return in JSON format:
{
    "sellToken": "<token symbol>",
    "buyToken": "<token symbol>",
    "sellAmount": "<amount as string>",
    "buyAmount": "<amount as string>",
    "isUSDTransfer: <boolean>
    "chain": "base"
}

Recent conversation:
{{recentMessages}}`;
