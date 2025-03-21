export const stakingConsultantTemplate = `
Extract the following details to recommend staking options:
- **amount** (Number): The amount of AF to stake on an AlfaFrens Channel.
- **userAddress** (String): The user address of the AlfaFrens account. Can be either:
  - A valid Ethereum address following regex format: ^0x[a-fA-F0-9]{40}$
  - A user name in format: degenfans
- **mysubs** (Boolean): Search only on my existing subscriptions.
- **mystake** (Boolean): Search only on my existing stakes.
- **minsubs** (Number): minimum subscriber count.

Provide the values in the following JSON format:

\`\`\`json
{
    "amount": number,
    "userAddress":string,
    "mysubs": boolean,
    "mytake": boolean,
    "minsubs":number
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
I (0x114B242D931B47D5cDcEe7AF065856f70ee278C4) want to stake 50000 AF
\`\`\`

**Response 1**

\`\`\`json
{
    "amount": 50000,
    "userAddress": "0x114B242D931B47D5cDcEe7AF065856f70ee278C4",
    "mysubs": false,
    "mytake": false
}
\`\`\`

**Message 2**

\`\`\`
I (degenfans) want to stake 42000 AF at my subscriptions
\`\`\`

**Response 2**

\`\`\`json
{
    "amount": 42000,
    "userAddress": "degenfans",
    "mysubs": true,
    "mytake": false
}
\`\`\`


**Message 3**

\`\`\`
I want to stake 7000 AF at my stakes
\`\`\`

**Response 3**

\`\`\`json
{
    "amount": 7000,
    "userAddress": "",
    "mysubs": false,
    "mytake": true
}
\`\`\`



**Message 4**

\`\`\`
I want to stake 9000 AF at my stakes and subscriptions
\`\`\`

**Response 4**

\`\`\`json
{
    "amount": 9000,
    "userAddress": "",
    "mysubs": true,
    "mytake": true
}
\`\`\`

**Message 5**

\`\`\`
I want to stake 4600 AF with minimum subscriptions 10
\`\`\`

**Response 5**

\`\`\`json
{
    "amount": 4600,
    "userAddress": "",
    "mysubs": true,
    "mytake": true,
    "minsubs":10
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
