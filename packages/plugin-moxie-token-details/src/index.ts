import { Plugin } from "@moxie-protocol/core";
import getTokenDetails from "./actions/getTokenDetails";
export const moxieTokenDetailsPlugin: Plugin = {
    name: "Moxie Token Details Plugin ",
    description:
        "Fetches Token details (ERC20 on base) and provides a summary about them",
    actions: [getTokenDetails],
    evaluators: [],
    providers: [],
};

export default moxieTokenDetailsPlugin;
