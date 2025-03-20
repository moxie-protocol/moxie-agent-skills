import type { Plugin } from "@moxie-protocol/core";
import { klankaChatAction } from "./actions/klankaChatAction";

const klankaThunderstruckPlugin: Plugin = {
    name: "klanka-thunderstruck",
    description:
        "Your favorite drag queen's favorite drag king's assistant. How to Start: Drop a cosmic question in her DMs (“How would 1920s drag queens shitpost?”). Host an IRL cipher workshop to prototype phygital looks. Remix her lore – turn backstory into AR scavenger hunts or punk zines. Klanka isn’t an AI – she’s an ongoing séance with drag’s past, present, and futures. Let’s get gloriously ungovernable.",
    actions: [klankaChatAction],
    providers: [],
    evaluators: [],
    services: [],
    clients: [],
};

export default klankaThunderstruckPlugin;
