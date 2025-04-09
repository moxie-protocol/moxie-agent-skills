import { ethers } from "ethers";

export const transferEthTemplate = `
Extract the following details to transfer ETH on Base:
- **amount** (Number): The amount of ETH on Base to transfer in wei.
- **toAddress** (String): The address to transfer the ETH to on Base. Can be either:
  - A valid Ethereum address following regex format: ^0x[a-fA-F0-9]{40}$
  - An ENS name in format: name.eth

Provide the values in the following JSON format:

\`\`\`json
{
    "amount": number,
    "toAddress": string,
    "isENS": boolean
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
Send 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4
\`\`\`

**Response 1**

\`\`\`json
{
    "amount": 0.01,
    "toAddress": "0x114B242D931B47D5cDcEe7AF065856f70ee278C4",
    "isENS": false
}
\`\`\`

**Message 2**

\`\`\`
Send 0.5 ETH to tokenstaker.eth
\`\`\`

**Response 2**

\`\`\`json
{
    "amount": 0.5,
    "toAddress": "tokenstaker.eth",
    "isENS": true
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const dustRequestTemplate = `
Provide the following details to dust tokens in your wallet:
- **threshold** (Number): The USD threshold for a token to be considered dust tokens.

Provide the values in the following JSON format:

\`\`\`json
{
    "threshold": number
}
\`\`\`

# Example 1

**Message 1**

\`\`\`
Dust tokens under $5
\`\`\`

**Response 1**

\`\`\`json
{
    "threshold": 5
}
\`\`\`

# Example 2

**Message 2**

\`\`\`
Dust tokens under $10
\`\`\`

**Response 2**

\`\`\`json
{
    "threshold": 10
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
    "threshold": 1
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
    "threshold": null
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const swapInProgressTemplate = (
    sellTokenSymbol: string,
    sellTokenAddress: string,
    buyTokenSymbol: string,
    txHash: string
) => ({
    text: `\nDusting $${sellTokenSymbol} to $${buyTokenSymbol} is in progress.\nView transaction status on [BaseScan](https://basescan.org/tx/${txHash})`,
    content: {
        url: `https://basescan.org/tx/${txHash}`,
    },
});

export const swapCompletedTemplate = (
    sellTokenSymbol: string,
    sellTokenAddress: string,
    buyTokenSymbol: string,
    buyAmountInWEI: bigint,
    buyTokenDecimals: number
) => ({
    text: `\nDusting $${sellTokenSymbol} to $${buyTokenSymbol} completed successfully. ${buyAmountInWEI && buyAmountInWEI > 0n ? `\n${ethers.formatUnits(buyAmountInWEI.toString(), buyTokenDecimals)} ${buyTokenSymbol} received.` : ""}\n`,
});
