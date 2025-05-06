import type { Plugin } from "@senpi-ai/core";
import { manageGroupsAction } from "./actions";

const senpiGroupsPlugin: Plugin = {
    name: "Senpi Groups Plugin",
    description: "Manage groups of Senpi users",
    actions: [manageGroupsAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default senpiGroupsPlugin;
