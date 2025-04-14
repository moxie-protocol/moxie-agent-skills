export const explanationTemplate = `
Based on the user's question/message, please provide a detailed and long answer based on the context provided below.

Here is the context:
\`\`\`
🎯 Bankless Claimables helps you discover and claim token airdrops, rewards, and other claimables across your connected wallets.

### 🔍 Key Capabilities

Here are the key capabilities of the Bankless Claimables Skill:

- Scans all your connected wallets for claimable airdrops, rewards, and other claimables in real-time
- Shows token amounts, USD values, and claim status
- Provides direct claim links to airdrop platforms
- Sorts airdrops by value to highlight the most valuable ones first
- Filters to show only unclaimed airdrops

### ⚙️ How It Works

Here is a brief overview of how the Bankless Claimables Skill works to fetch and display your claimable airdrops, rewards, and other claimables:

1. Get all your connected wallets and your agent's wallets addresses
2. Fetch all the claimable airdrops, rewards, and other claimables using the Bankless Claimables API
3. Filter the airdrops, rewards, and other claimables to only include the ones that are claimable by your wallets
4. Display the available airdrops, rewards, and other claimables that are claimable by your wallets in a table format

### 💡 Try These Commands

Here are some commands you can try using the Airdrop Hunter Skill:

- "Check my wallets for available claimables"
- "Show me my claimable claimables"
- "List my available claimables"
- "What claimables are available to claim?"
- "Check my claimable status"
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;
