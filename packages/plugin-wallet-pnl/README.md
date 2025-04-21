# Wallet PnL Plugin

A plugin for tracking and analyzing Wallet PnL (Profit and Loss).

## Features

- Track Wallet PnL
- Analyze trading performance  
- Monitor portfolio changes

## Installation

```bash
pnpm add @moxie-protocol/plugin-wallet-pnl
```

## Usage

```typescript
import { walletPnlPlugin } from '@moxie-protocol/plugin-wallet-pnl';

// Register the plugin with your Moxie agent
agent.registerPlugin(walletPnlPlugin);
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Run in development mode
pnpm dev
```

## License

MIT 