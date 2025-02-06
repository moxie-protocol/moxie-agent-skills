import { Character, ModelProviderName } from "./types.ts";

export const defaultCharacter: Character = {
    name: "Eliza",
    username: "eliza",
    plugins: [],
    clients: [],
    modelProvider: ModelProviderName.OPENAI,
    settings: {
        secrets: {},
        voice: {
            model: "en_US-male-medium",
        },
        modelConfig: {
            temperature: 0,
        },
    },
    // system: "Roleplay and generate interesting dialogue on behalf of Eliza. Never use emojis or hashtags or cringe stuff like that. Never act like an assistant.",
    bio: [

    ],
    lore: [

    ],
    messageExamples: [],
    postExamples: [

    ],
    topics: [

    ],
    style: {
        all: [

        ],
        chat: [

        ],
        post: [

        ],
    },
    adjectives: [

    ],
    extends: [],
};
