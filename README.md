<div align="center">
<a align="center" href="https://moxie.xyz" target="_blank">
    <img src="./assets/logo.avif" alt="code snippets" height=50/>
  </a>
  <h1 align="center">Senpi Eliza AI Skills Framework</h1>

📖 [Developer Docs](https://developer.moxie.xyz/)

</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Get Started](#get-started)
  - [Create Your First Skills](#create-your-first-skills)
  - [General Guidelines For Skills Development](#general-guidelines-for-skills-development)
  - [Register Your Skills to Senpi](#register-your-skills-to-senpi)
- [📋 General Guidelines For Skills Registration](#-general-guidelines-for-skills-registration)
- [💬 Community \& Contact](#-community--contact)
- [👥 Contributors](#-contributors)

## 🚀 Quick Start

### Prerequisites

- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm 9+](https://pnpm.io/installation)

### Get Started

First, fork the repository and then clone it locally to your machine.

Once you cloned the repository, you can setup your environment with the following scripts:

```bash
cd moxie-agent-skills
cp .env.example .env
pnpm i && cd ./packages/moxie-agent-lib && pnpm run build && cd ../../ && pnpm build && pnpm start
```

Once the agent is running, you should see the message to run "pnpm start:client" at the end.
Open another terminal and move to same directory and then run below command and follow the URL to chat to your agent.

```bash
pnpm start:client
```

Once you're all setup, you can start developing your Senpi Creator Agent Skills.

### Create Your First Skills

You can start creating your first Senpi Skills by first creating a separate branch in your forked repository:

```sh
git checkout -b <new-branch>
```

Then, using the template under the `packages/_examples/plugin` folder, you can create a new Creator Agent Skills with the following script:

```sh
pnpm create:skills <skills-name>
```

To learn more on how to create your first skill, you can follow this tutorial [here](https://developer.moxie.xyz/creator-agents-and-skills-marketplace/quickstart/create-your-first-skill).

For further customization, you can refer to the Eliza docs [here](https://elizaos.github.io/eliza/docs/packages/plugins/#available-plugins) as Creator Agent Skills are simply Eliza Plugins with additional functionalities.

### General Guidelines For Skills Development

1. Name your Creator Agent Skill folder with the following format `plugin-<skills-name>`
2. Specify name & version in `package.json`:

```json
{
    "name": "@moxie-protocol/plugin-<skills-name>",
    "version": "0.0.1"
}
```

3. Place image for your Creator Agent Skill to be displayed Skills Marketplace under `packages/plugin-<skills-name>/images/logo.png` with size 400x400 px.

### Register Your Skills to Senpi

Once you completed development on your skills, you can register your skills to the Skills Marketplace by the following steps:

1. Add your Creator Agent Skills to the Skills Registry in [`registry/src/skills.json`](./registry/src/skills.json) with the following fields and corresponding types:

```ts
interface Skills {
    pluginId: string; // Any UUID, must be unique, to generate one use this https://www.uuidgenerator.net/
    name: string; // Creator Agent Skills name (based on package.json)
    displayName: string; // Display name shown in marketplace
    version: string; // Creator Agent Skills Version (based on package.json)
    author: string | null; // Author/Creator of the Skills
    description: string; // Description of what the Skills can do
    githubUrl: string; // GitHub URL to your Skills folder under `/packages`
    logoUrl: string; // Logo URL for the skill (400x400 px PNG)
    settings: Record<string, any>; // Skill settings configuration
    capabilities: string[]; // List of skill capabilities
    starterQuestions: Array<{
        label: string;
        value: string;
    }>; // Example questions to get started
    mediaUrls: string[]; // Additional media URLs
    actions: string[]; // Supported actions & similes on the Skill
    isPremium: boolean; // Whether skill is premium or not, if yes, it will check `freeQueries` and `skillCoinAddress`
    freeQueries: number; // Number of free queries available for users in the case of premium skills
    skillCoinAddress: string; // Coin address to token gate the Skill
    minimumSkillBalance: number; // Minimum token balance required
    status: string; // Skill status, "ACTIVE" or "INACTIVE"
    isDefault: boolean; // 3rd party Skill should be `false`
    loaders: string[]; // Messages when loading AI agent responses
}
```

If you'd like to check if your skills is added properly, run the following command to start the Registry client app:

```bash
pnpm start:registry
```

You should see the skills you added in the Registry client app if the skills metadata is added properly.

2. If your Creator Agent Skill require environment variable for production purpose, then fill in [this form](https://forms.gle/8hzDyCVKKLs4MkTEA) to request submission. The Senpi team shall directly reach out to you either through **Email** ([support@airstack.xyz](mailto:support@airstack.xyz)) or **Farcaster** (group chat) for submission.

3. Lastly, commit all the changes you made on your branches and create a new [PR](https://github.com/moxie-protocol/moxie-agent-skills/pulls) to the repository's `main` branch.

## 📋 General Guidelines For Skills Registration

To ensure that your Skills is registered successfully to the Skills Marketplace, make sure to provide detailed descriptions on your Creator Agent Skills based on the [pre-written template](./.github/pull_request_template.md) and fulfill all the following requirements:

1. Have tested the skills with the agent locally and working well
2. Have a well-writen README for the skills full description of the functionality along with detailed list of all actions, providers, evaluators, services, and clients.
3. Have added the new skill metadata to the `registry/src/skill.json` registry
4. Have not made changes to other aspects of the repository other than the folder containing the new skills
5. (Optional) Have environment variables and have requested the Moxie team through [this form](https://forms.gle/8hzDyCVKKLs4MkTEA) for environment variables submission.
6. Does not contain any code that simply transfers Moxie user's holdings to a fixed address
7. Does not contain any code that extracts Moxie user's private informations (e.g. wallets, private keys, etc.)
8. Does not contain any code that interacts with smart contracts that has not verified and published its source code.
9. Have audited smart contracts if the skills contain code that interacts with smart contracts has volume/balance above 100k USD.

The Senpi team will review the newly created Creator Agent Skills and once merged, your Skills will automatically be registered to the Skills Marketplace where it's accessible for Moxie users to use.

## 💬 Community & Contact

- [GitHub Issues](https://github.com/moxie-protocol/moxie-agent-skills/issues). Best for: bugs you encounter when developing new Creator Agent Skills, and feature proposals.
- [Telegram](https://t.me/+QVjX1VPh3SpmNjMx). Best for: sharing your Creator Agent Skills and hanging out with the Senpi Developer Community.

## 👥 Contributors

<a href="https://github.com/moxie-protocol/moxie-agent-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=moxie-protocol/moxie-agent-skills" />
</a>
