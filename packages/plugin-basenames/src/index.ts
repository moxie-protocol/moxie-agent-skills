import type { Plugin } from "@moxie-protocol/core";
import viewOwnedBasenamesAction from "./actions/viewOwnedBasenames";
// import queryBasenameAvailabilityAction from "./actions/queryBasenameAvailability";
// import registerBasenameAction from "./actions/registerBasename";
import describeBasenamesSkillAction from "./actions/describeBasenamesSkill";
// import suggestBasenameAlternativesAction from "./actions/suggestBasenameAlternatives"; // NEW: LLM-powered suggestions

// All actions now have explicit parameter/output typing and validation for audit compliance

const basenamesPlugin: Plugin = {
    name: "basenames",
    description: "Manage your Basenames with natural language commands.",
    actions: [
        viewOwnedBasenamesAction,
        // queryBasenameAvailabilityAction,
        // registerBasenameAction,
        describeBasenamesSkillAction,
        // suggestBasenameAlternativesAction,
    ],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default basenamesPlugin;
