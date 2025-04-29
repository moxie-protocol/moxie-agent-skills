import { Plugin } from "@senpi-ai/core";
import getTokenDetails from "./actions/getTokenDetails";
export const senpiTokenDetailsPlugin: Plugin = {
    name: "Senpi Token Details Plugin ",
    description:
        "Fetches Token details (ERC20 on base) and provides a summary about them",
    actions: [getTokenDetails],
    evaluators: [],
    providers: [],
};

export default senpiTokenDetailsPlugin;
