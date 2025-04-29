# @elizaos/plugin-senpi-balance

A skill for moxie AI agnent that enables fetching token sentiment.

## Description

This skill provides Base ERC20 token sentiments using the recent posts on Farcaster & Twitter(X).

## Installation

```sh
pnpm i @elizaos/plugin-token-social-sentiment
```

## Actions

- `getTokenSocialSentiment`

The `getTokenSocialSentiment` action provides the ability for the agent to fetch Base ERC20 token sentiments.

The analysis includes the data from Farcaster and Twitter(X), latest trends, tweets and casts.


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
"@elizaos/plugin-token-social-sentiment": "workspace:*"
```

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](../../CONTRIBUTING.md) file for more information.

## License

This AI Agent Skills is part of the Moxie AI Agent project. See the main project repository for license information.
