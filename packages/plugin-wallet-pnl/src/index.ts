import { Plugin } from "@moxie-protocol/core";
import { walletPnlAction } from "./actions/pnlAction";

const walletPnlPlugin: Plugin = {
  name: 'wallet-pnl',
  description: 'Wallet PnL tracking plugin',
  actions: [walletPnlAction],
  evaluators: [],
  providers: [],
}; 

export default walletPnlPlugin;