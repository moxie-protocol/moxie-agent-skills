import type { Plugin } from "@moxie-protocol/core";
import { tutorialAction } from "./actions/tutorialAction";

const tutorialPlugin: Plugin = {
    name: "plugin-senpi-tutorial",
    description: "Provide users with related Youtube tutorials to use Senpi",
    actions: [tutorialAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default tutorialPlugin;
