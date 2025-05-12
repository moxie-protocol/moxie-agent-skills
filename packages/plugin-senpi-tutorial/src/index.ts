import type { Plugin } from "@moxie-protocol/core";
import { tutorialAction } from "./actions/tutorialAction";
import { learnSenpiAction } from "./actions/learnSenpiAction";

const tutorialPlugin: Plugin = {
    name: "plugin-senpi-tutorial",
    description: "Provide users with related Youtube tutorials to use Senpi",
    actions: [tutorialAction, learnSenpiAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default tutorialPlugin;
