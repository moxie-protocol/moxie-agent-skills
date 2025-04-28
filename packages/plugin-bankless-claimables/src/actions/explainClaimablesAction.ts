import {
    composeContext,
    generateText,
    ModelClass,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@moxie-protocol/core";
import { explanationTemplate } from "../templates";

const explainClaimablesAction: Action = {
    name: "EXPLAIN_BANKLESS_CLAIMABLES",
    similes: [
        "EXPLAIN_BANKLESS_CLAIMABLES_CAPABILITIES",
        "HOW_DOES_BANKLESS_CLAIMABLES_WORK",
        "HOW_DOES_BANKLESS_CLAIMABLES_FIND_CLAIMABLE_AIRDROPS",
        "HOW_DOES_BANKLESS_CLAIMABLES_FIND_MY_CLAIMABLE_AIRDROPS",
        "HOW_DOES_BANKLESS_CLAIMABLES_FIND_MY_CLAIMABLE_AIRDROPS",
        "WHAT_EXAMPLE_QUESTIONS_CAN_I_ASK_ABOUT_BANKLESS_CLAIMABLES",
    ],
    description:
        "Provides an explanation of the Bankless Claimables Skill and its capabilities.",
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "How does the Bankless Claimables Skill work?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `🎯 Bankless Claimables helps you discover and claim token airdrops, rewards, and other claimables across your connected wallets.

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
- "Check my claimable status"`,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you tell me more about the Bankless Claimables Skill?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: `🎯 Bankless Claimables helps you discover and claim token airdrops, rewards, and other claimables across your connected wallets.

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
- "Check my claimable status"`,
                },
            },
        ],
    ],

    validate: async () => true,

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const context = composeContext({
            state: {
                ...state,
            },
            template: explanationTemplate,
        });

        const response = await generateText({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
        });
        await callback?.({
            text: response,
        });
    },
};

export default explainClaimablesAction;
