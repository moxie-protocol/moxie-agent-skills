# Airdrop Hunter

**A Moxie AI Skill Plugin to detect claimable crypto airdrops.**

---

## 🔍 Description

The Airdrop Hunter skill enables Moxie AI Agents to check all connected agent wallets for claimable airdrops via the Bankless claimables API

---

## ⚙️ Installation

This skill is part of the Moxie AI Agent ecosystem and is already registered by default.

To develop or test locally:

pnpm i
pnpm build
Set up your environment in .env:

BANKLESS_API_KEY=your_bankless_key_here
PRIVATE_KEY=your_local_private_key
RPC_URL=https://your_rpc_node_url
🧠 Capabilities
✅ Uses agent wallet(s) from state.agentWallet or state.agentWallets

✅ Calls the /claimables/{address} endpoint securely

✅ Presents token amount, value, expiry, and status

✅ Offers direct claim links (e.g., https://bankless.com/claimables/{address})

🧪 Example Usage
User Prompt:

Check my wallets for any airdrops I can claim.
Agent Response:

You have 2 claimable airdrops:

Optimism OP Tokens: 150 OP tokens (worth $450.50 USD)
Status: Unclaimed
Expires: 2025-05-15
[Claim Now](https://app.optimism.io/claim)

📁 File Structure
plugin-airdrop-hunter/
├── src/
│ ├── index.ts # Plugin registration
│ └── actions/
│ └── checkAirdropsAction.ts # Main action logic
├── README.md

🛡 Environment Variables
Required in .env:

Variable Description
BANKLESS_API_KEY Auth key for Bankless API
PRIVATE_KEY Simulated agent wallet (local only)
RPC_URL EVM-compatible RPC node (local only)

🧼 License
MIT License © Alex and Yoseph

🔐 Security
Please report any vulnerabilities responsibly via the method outlined in the root SECURITY.md file.

---
