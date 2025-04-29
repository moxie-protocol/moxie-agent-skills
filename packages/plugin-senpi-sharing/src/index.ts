import { Plugin } from "@senpi-ai/core";
import postContent from "./actions/postContent";

export const senpiSharingPlugin: Plugin = {
    name: "Senpi Sharing Plugin",
    description:
        "Creates and shares summarized content across social platforms",
    actions: [postContent],
    evaluators: [],
    providers: [],
};

export default senpiSharingPlugin;
