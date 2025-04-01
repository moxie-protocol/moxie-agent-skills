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
I (degenfans) want to stake 42000 AF at my active subscriptions
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
I want to stake 7000 AF at my existing stakes
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
I want to stake 9000 AF at my existing stakes and subscriptions
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
I want to stake 4600 AF on channels with minimum 10 subscriptions
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


**Message 6**

\`\`\`
What are your top picks for staking on AlfaFrens?
\`\`\`

**Response 6**

\`\`\`json
{
    "amount": 0,
    "userAddress": "",
    "mysubs": false,
    "mytake": false
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;



export const gasUsageTemplate = `
Extract the following details to the users gas usage:
- **userAddress** (String): The user address of the AlfaFrens account. Can be either:
  - A valid Ethereum address following regex format: ^0x[a-fA-F0-9]{40}$
  - A user name in format: degenfans

Provide the values in the following JSON format:

\`\`\`json
{
    "userAddress":string,
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
give me gas usage informations for the user 0x114B242D931B47D5cDcEe7AF065856f70ee278C4
\`\`\`

**Response 1**

\`\`\`json
{
    "userAddress": "0x114B242D931B47D5cDcEe7AF065856f70ee278C4",
}
\`\`\`

**Message 2**

\`\`\`
show me gas usage for degenfans
\`\`\`

**Response 2**

\`\`\`json
{
    "userAddress": "degenfans",
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const infoTextTemplate = `Make the following text more indivual and use fancy markdown language:

{{infoText}}
`;
