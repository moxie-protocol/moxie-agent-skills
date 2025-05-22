import { formatTokenMention } from "@moxie-protocol/moxie-agent-lib";
import { ethers } from "ethers";

export const dustRequestTemplate = `
Provide the following details to dust tokens in your wallet:
- **threshold** (Number): The USD threshold for a token to be considered dust tokens.
- **isConfirmed** (Boolean): Whether the user has confirmed the dusting.
Provide the values in the following JSON format:
\`\`\`json
{
    "threshold": number?,
    "isConfirmed": boolean?
}
\`\`\`
"?" indicates that the value is optional.
# Example 1
**Message 1**
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "Dust tokens under $5"
        }
    },
    {
        "user": "{{user2}}",
        "content": {
            "text": "You are trying to dust tokens under $5 from your agent wallet. Depending on the number of tokens, this may take a several minutes to complete. \n\nDo you want to proceed?"
        }
    },
    {
        "user": "{{user1}}",
        "content": {
            "text": "Yes, proceed"
        }
    }
]
\`\`\`
**Response 1**
\`\`\`json
{
    "threshold": 5,
    "isConfirmed": true
}
\`\`\`
# Example 2
**Message 2**
\`\`\`
[
    {
        "user": "{{user1}}",
        "content": {
            "text": "Dust tokens under $10"
        }
    },
    {
        "user": "{{user2}}",
        "content": {
            "text": "You are trying to dust tokens under $10 from your agent wallet. Depending on the number of tokens, this may take a several minutes to complete. \n\nDo you want to proceed?"
        }
    },
    {
        "user": "{{user1}}",
        "content": {
            "text": "No."
        }
    }
]
\`\`\`
**Response 2**
\`\`\`json
{
    "threshold": 10,
    "isConfirmed": false
}
\`\`\`
# Example 3
**Message 3**
\`\`\`
Dust tokens under $1
\`\`\`
**Response 3**
\`\`\`json
{
    "threshold": 1,
    "isConfirmed": null
}
\`\`\`
# Example 4
**Message 4**
\`\`\`
Dust my tokens
\`\`\`
**Response 4**
\`\`\`json
{
    "threshold": null,
    "isConfirmed": null
}
\`\`\`
Here are the recent user messages for context:
{{recentMessages}}
`;

export const swapInProgressTemplate = (
    sellTokenSymbol: string,
    sellTokenAddress: string,
    buyTokenSymbol: string,
    buyTokenAddress: string,
    txHash: string
) => ({
    text: `\nDusting ${formatTokenMention(sellTokenSymbol, sellTokenAddress)} to ${formatTokenMention(buyTokenSymbol, buyTokenAddress)} is in progress.\nView transaction status on [BaseScan](https://basescan.org/tx/${txHash})`,
    content: {
        url: `https://basescan.org/tx/${txHash}`,
    },
});

export const swapCompletedTemplate = (
    sellTokenSymbol: string,
    sellTokenAddress: string,
    buyTokenSymbol: string,
    buyTokenAddress: string,
    buyAmountInWEI: bigint,
    buyTokenDecimals: number
) => ({
    text: `\nDusting ${formatTokenMention(sellTokenSymbol, sellTokenAddress)} to ${formatTokenMention(buyTokenSymbol, buyTokenAddress)} completed successfully. ${buyAmountInWEI && buyAmountInWEI > 0n ? `\n${ethers.formatUnits(buyAmountInWEI.toString(), buyTokenDecimals)} ${buyTokenSymbol} received.` : ""}\n`,
});
