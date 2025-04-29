import type { Plugin } from "@senpi-ai/core";
import { manageGroupsAction } from "./actions";

const moxieGroupsPlugin: Plugin = {
    name: "Moxie Groups Plugin",
    description: "Manage groups of Moxie users",
    actions: [manageGroupsAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default moxieGroupsPlugin;
