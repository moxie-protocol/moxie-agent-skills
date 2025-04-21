# 📋 Senpi AI Skill Pre-launch Checklist

To ensure that your Skills is registered successfully to the Skills Marketplace, make sure to provide detailed descriptions on your Creator Agent Skills based on the [pre-written template](./.github/pull_request_template.md) and fulfill all the following requirements:

## 🔹 Quick Start & Onboarding

- [ ] **Immediate Usability**

    Your skill must be ready to use immediately upon activation, without additional setup. Users should have seamless initial interactions without needing account creation, wallet linking, or manual configurations.

- [ ] **Intuitive Starter Prompts**

    Include clear and informative starter prompts that immediately demonstrate and explain your skill's capabilities. The first prompt should always be informative, providing a comprehensive overview of the skill when clicked.

    **Example Starter Prompts:**

- **Starter Prompt #1 (Informative – Skill Overview):**

    > ✅ "Welcome! Your ETH Balance Tracker skill is now active. With this skill, you can quickly check your ETH balances, securely send transactions from your embedded wallet, and interact with tokens directly within the skill. Try asking, 'What's my ETH balance on Base?' or 'Send 0.1 ETH to 0x1234...abcd' to explore its capabilities."

- **Starter Prompt #2 (Ability – Balance Check):**

    > "What's my current ETH balance on Base?"

- **Starter Prompt #3 (Ability – Transaction):**

    > "Send 0.1 ETH to 0x1234...abcd."

## 🚦 **User Interaction & UX – Dos and Don'ts**

|   ✅ **DO**                                                               |   ❌ **DON'T**                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| ✅ Use clear, conversational language.                                    | ❌ Use jargon or overly technical terms.                     |
| ✅ Always confirm transactions clearly. (link to blockchain confirmation) | ❌ Execute transactions without explicit confirmation.       |
| ✅ Provide actionable error feedback.                                     | ❌ Show raw, cryptic error messages.                         |
| ✅ Allow immediate skill interaction upon installation.                   | ❌ Require complex initial setups before first use.          |
| ✅ Clearly articulate transaction details and fees.                       | ❌ Leave users unsure about transaction details or outcomes. |

### 🔹 **Clear Responses**

### 🔹 Clear Responses

- [ ] **Use Plain Language**

    Responses are concise, straightforward, and easy to understand.

- [ ] **Avoid Technical Jargon**

    Technical terms, acronyms, or complex phrases are minimized or clearly explained.

- [ ] **Provide Context**

    Responses include enough context for any user to clearly understand the outcome or action(s) taken.

**Example:**

> ✅ "Your wallet balance on Base is currently 1.25 ETH."
>
> ❌ "Balance returned from RPC: 1.25 ETH, status 200 OK."

## 🔹 **Detailed Confirmation Prompts**

- [ ] **Explicit Transaction Summary**

    Users see all essential transaction details clearly before executing actions:

    - Recipient Address
    - Token/Asset
    - Amount
    - Estimated Gas Fees
    - Blockchain Network (Base)

- [ ] **Easy Approval and Cancellation**

    Users can easily approve, reject, or modify transactions.

- [ ] **Deliver Transaction Link**

    Delivering a transaction link to places like [Basescan.org](http://Basescan.org) helps the user verify that an onchain transaction has been submitted correctly.

**Example Prompt:**

> ✅ "You're about to send 1.25 ETH from your embedded wallet to address 0x1234...abcd on Ethereum Mainnet. The estimated gas fee is 0.005 ETH (~$20). Would you like to proceed with the transaction?"
