<div align="center">
<a align="center" href="https://moxie.xyz" target="_blank">
    <img src="./assets/logo.avif" alt="code snippets" height=50/>
  </a>
  <h1 align="center">Moxie Agent Plugin</h1>

📖 [Developer Docs](https://developer.moxie.xyz/) | 🎯 [Whitepaper](https://build.moxie.xyz/the-moxie-protocol)

</div>

## 🚀 Quick Start

### Prerequisites

- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

### Get Started

First, fork the repository and then clone it locally to your machine.

Once you cloned the repository, you can setup your environment with the following scripts:

```bash
cd moxie-agent-plugin
cp .env.example .env
pnpm i && pnpm build && pnpm start --characters='characters/moxie.character.json'
```

Once the agent is running, you should see the message to run "pnpm start:client" at the end.
Open another terminal and move to same directory and then run below command and follow the URL to chat to your agent.

```bash
pnpm start:client
```

Once you're all setup, you can start developing your Moxie Creator Agent Skills.

### Create Your First Skills

You can start creating your first Moxie Skills by first creating a separate branch in your forked repository:

```sh
git checkout -b <new-branch>
```

Then, using the template under the `packages/_examples/plugin` folder, you can create a new Creator Agent Skills with the following script:

```sh
cp ./packages/_examples/plugin ./packages/plugin-<skills-name>
```

Make sure to name your skills with the format `plugin-<skills-name>`.

To learn more on how to create your first skill, you can follow this tutorial [here](https://developer.moxie.xyz/creator-agents-and-skills-marketplace/quickstart/create-your-first-skill).

For further customization, you can refer to the Eliza docs [here](https://elizaos.github.io/eliza/docs/packages/plugins/#available-plugins) as Creator Agent Skills are simply Eliza Plugins with additional functionalities.

### Register Your Skills to Moxie

To register your skills, commit all the changes you made on your branches and create a new [PR](https://github.com/moxie-protocol/moxie-agent-plugin/pulls) to the repository's `main` branch.

The Moxie team will review the newly created Creator Agent Skills and once merged, your Skills will automatically be registered to the Skills Marketplace where it's accessible for Moxie users to use.

### Community & Contact

- [GitHub Issues](https://github.com/moxie-protocol/moxie-agent-plugin/issues). Best for: bugs you encounter when developing new Creator Agent Skills, and feature proposals.
- [Telegram](https://t.me/+QVjX1VPh3SpmNjMx). Best for: sharing your Creator Agent Skills and hanging out with the Moxie Developer Community.

## Contributors

<a href="https://github.com/moxie-protocol/moxie-agent-plugin/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=moxie-protocol/moxie-agent-plugin" />
</a>
