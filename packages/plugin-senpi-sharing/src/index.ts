import { Plugin } from "@moxie-protocol/core";
import postContent from "./actions/postContent";

export const senpiSharingPlugin: Plugin = {
    name: "Senpi Sharing Plugin",
    description: "Creates and shares summarized content across social platforms",
    actions: [postContent],
    evaluators: [],
    providers: [],
};

export default senpiSharingPlugin; 