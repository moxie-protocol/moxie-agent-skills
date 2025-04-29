# @senpi-ai/plugin-senpi-token-details

A Skill for Moxie AI Agent that enables fetching of base token details.

## Description

This Skill provides real-time token details fetching capabilities for the Moxie AI Agent.

## Installation

```sh
pnpm i @senpi-ai/plugin-senpi-token-details
```

## Actions

1. `getTokenDetails`

The `getTokenDetails` action provides the ability for agent to fetch real-time ERC20 token details on Base.

Token details includes token name, token address, market cap, current price, etc.

## Development

1. Clone the repository
2. Install dependencies:

```sh
pnpm i --no-frozen-lockfile
```

3. Build the plugin:

```sh
pnpm build
```

4. Run linting:

```sh
pnpm lint
```

## Dependencies

```json
"@senpi-ai/plugin-senpi-token-details": "workspace:*"
```

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for more information.

## License

This AI Agent Skills is part of the Moxie AI Agent project. See the main project repository for license information.
