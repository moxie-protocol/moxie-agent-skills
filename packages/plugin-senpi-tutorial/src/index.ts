import type { Plugin } from "@moxie-protocol/core";
import { tutorialAction } from "./actions/tutorialAction";
import { learnSenpiAction } from "./actions/learnSenpiAction";

const tutorialPlugin: Plugin = {
    name: "plugin-senpi-tutorial",
    description:
        "Provide users with related Youtube tutorials to answer their how-to questions about Senpi, such as how to research tokens, how to setup limit orders, how to setup autonomous trading, and more.",
    actions: [tutorialAction, learnSenpiAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default tutorialPlugin;
