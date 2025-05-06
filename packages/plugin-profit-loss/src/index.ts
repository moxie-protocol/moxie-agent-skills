import { Plugin } from "@moxie-protocol/core";
import { PnLAction } from "./actions/pnlAction";

const pnlPlugin: Plugin = {
  name: 'pnl',
  description: 'PnL tracking plugin',
  actions: [PnLAction],
  evaluators: [],
  providers: [],
}; 

export default pnlPlugin;