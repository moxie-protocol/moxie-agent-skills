# Basenames Skill for Moxie AI

Easily manage your Basenames—view ownership, check availability, register, and get suggestions—directly from your Moxie AI agent.

---

## Table of Contents

- [Basenames Skill for Moxie AI](#basenames-skill-for-moxie-ai)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Features](#features)
  - [Installation](#installation)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [Actions](#actions)
    - [Adding or Modifying Actions](#adding-or-modifying-actions)
  - [License](#license)

---

## Overview

The **Basenames Skill** enables users to manage [Basenames](https://base.org) on the Base network through natural language with Moxie AI. Users can view owned Basenames, check availability, register new Basenames, and get alternative suggestions—all in a secure, compliant, and user-friendly manner.

---

## Features

- **View Owned Basenames**: See all Basenames owned across your connected wallets, with expiry dates.
- **Check Basename Availability**: Instantly check if a Basename is available for registration.
- **Register Basenames**: Register available Basenames, with clear cost and duration prompts and secure wallet transactions.
- **Suggest Alternatives**: Get AI-powered suggestions for similar Basenames if your first choice is taken.
- **Skill Description**: Ask for a summary of what the skill can do.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v16+ and [npm](https://www.npmjs.com/)
- Access to a Moxie AI agent environment with skill plugin support

### Steps

1. **Clone the repository:**
    ```bash
    git clone https://github.com/your-github/plugin-basenames.git
    cd plugin-basenames
    ```

Install dependencies:

npm install

Build the skill:

npm run build
Configure environment variables:

Copy .env.example to .env (if present), or create .env:
RPC_URL=https://mainnet.base.org
PRIVATE_KEY=your_private_key_here
Note: For production, never commit real private keys.
Register the skill with your Moxie agent according to your platform’s documentation.

Configuration
RPC_URL: The Base mainnet RPC endpoint (default: https://mainnet.base.org).
PRIVATE_KEY: (Optional) Used for backend operations if needed; most wallet actions use user wallets via Moxie.
Usage
Once installed and registered, interact with the skill in Moxie using natural language. Example queries:

“Show my basenames.”
“Is ‘charlie.base’ available?”
“Register ‘charlie.base’ for 1 year.”
“Suggest alternatives for ‘charlie.base’.”
“What can I do with the Basenames skill?”
The skill will guide you through multi-step actions (like registration) and confirm actions before any transaction is sent.

## Actions

| Action Name                   | Description                                                     | Example Query                             |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| VIEW_OWNED_BASENAMES          | List all Basenames owned by user                                | "Show my basenames."                      |
| QUERY_BASENAME_AVAILABILITY   | Check if a given Basename is available for registration         | "Is 'charlie.base' available?"            |
| REGISTER_BASENAME             | Register a Basename if available, with user confirmation        | "Register 'charlie.base' for 1 year."     |
| SUGGEST_BASENAME_ALTERNATIVES | Suggest available Basename alternatives if desired one is taken | "Suggest alternatives for 'charlie.base'" |
| DESCRIBE_BASENAMES_SKILL      | Get a summary of the skill's capabilities                       | "What can I do with the Basenames skill?" |

Compliance & Security

Moxie Eliza Skills Framework: All actions are fully compliant, including similes, examples, validate, parameters, and suppressInitialMessage fields.
User Data: All wallet interactions use the user's Moxie wallet abstraction. No sensitive keys are exposed.
Error Handling: All errors are user-friendly and logged for audit.
No Sensitive Logging: Only necessary information is logged for debugging or audit.
Environment Variables: Do not commit secrets or private keys to version control.

Development
Code Structure
src/index.ts: Skill plugin entrypoint.
src/actions/: All action handlers.
registry/skills.json: Skill manifest for Moxie registry/platform.

### Adding or Modifying Actions

Each action must include:

- `name`
- `similes`
- `description`
- `parameters`
- `examples`
- `validate` (function)
- `suppressInitialMessage`
- a handler that calls the callback with `{ text: ... }`

plugin-basenames/
├── .env
├── package.json
├── registry/
│ └── skills.json
├── src/
│ ├── index.ts
│ └── actions/
│ ├── viewOwnedBasenames.ts
│ ├── queryBasenameAvailability.ts
│ ├── registerBasename.ts
│ ├── describeBasenamesSkill.ts
│ └── suggestBasenameAlternatives.ts
└── README.md

## License

MIT License
