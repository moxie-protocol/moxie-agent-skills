export const transferEthTemplate = `
Extract the following details to transfer ETH on Base:
- **amount** (Number): The amount of ETH on Base to transfer in wei. Multiply by 1e18 to get the amount in wei.
- **toAddress** (String): The address to transfer the ETH to on Base. Address should follow this regex format: ^0x[a-fA-F0-9]{40}$

Provide the values in the following JSON format:

\`\`\`json
{
    "amount": number,
    "toAddress": string
}
\`\`\`

Here is an example message and it's corresponding response:

**Message**

\`\`\`
Send 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4
\`\`\`

**Response**

\`\`\`json
{
    "amount": 1e16,
    "toAddress": "0x114B242D931B47D5cDcEe7AF065856f70ee278C4"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
