export const coinTossTemplate = `
Extract the following details to flip a coin:
- **betAmount** (String): The amount to wager.
- **face** (String): The side of the coin to bet on. Can be either:
  - HEADS
  - TAILS
- **token** (String): The optional token symbol.

Provide the values in the following JSON format:

\`\`\`json
{
    "betAmount": string,
    "face": string,
    "token": string
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
Bet 0.01 ETH on heads
\`\`\`

**Response 1**

\`\`\`json
{
    "betAmount": "0.01",
    "face": "heads",
    "token" "ETH"
}
\`\`\`

**Message 2**

\`\`\`
Double or nothing 0.5 on heads
\`\`\`

**Response 2**

\`\`\`json
{
    "betAmount": "0.5",
    "face": "HEADS",
    "token": "",
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const getBetsTemplate = `
Extract the following details to get the bets:
- **bettor** (String): The address of the player.
- **game** (String): The game. Can be either:
  - coin-toss
  - dice
  - roulette
  - keno
- **token** (String): The token address.

Provide the values in the following JSON format:

\`\`\`json
{
    "bettor": string,
    "game": string,
    "token": string
}
\`\`\`

Here are example messages and their corresponding responses:

**Message 1**

\`\`\`
Get bets
\`\`\`

**Response 1**

\`\`\`json
{
    "bettor": "",
    "game": "",
    "token" ""
}
\`\`\`

**Message 2**

\`\`\`
Get dice bets
\`\`\`

**Response 2**

\`\`\`json
{
    "bettor": "",
    "game": "dice",
    "token" ""
}
\`\`\`

**Message 3**

\`\`\`
Get dice bets of 0x057BcBF736DADD774A8A45A185c1697F4cF7517D
\`\`\`

**Response 3**

\`\`\`json
{
    "bettor": "0x057BcBF736DADD774A8A45A185c1697F4cF7517D",
    "game": "dice",
    "token" ""
}
\`\`\`
**Message 4**

\`\`\`
Get 0x0000000000000000000000000000000000000000 dice bets of 0x057BcBF736DADD774A8A45A185c1697F4cF7517D
\`\`\`

**Response 4**

\`\`\`json
{
    "bettor": "0x057BcBF736DADD774A8A45A185c1697F4cF7517D",
    "game": "dice",
    "token" "0x0000000000000000000000000000000000000000"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
