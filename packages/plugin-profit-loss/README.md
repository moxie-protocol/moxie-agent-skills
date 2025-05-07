# PnL Plugin

A plugin for tracking and analyzing PnL (Profit and Loss).

## Features

- Track PnL
- Analyze trading performance
- Monitor portfolio changes

## Installation

```bash
pnpm add @moxie-protocol/plugin-profit-loss
```

## Usage

```typescript
import { PnLAction } from '@moxie-protocol/plugin-profit-loss';

// Register the plugin with your Moxie agent
agent.registerPlugin(PnLAction);
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