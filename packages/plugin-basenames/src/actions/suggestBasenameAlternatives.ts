import { ethers } from "ethers";
import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";

// Smart contract details as before
const REGISTRAR_CONTROLLER_ADDRESS =
    "0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5";
const REGISTRAR_CONTROLLER_ABI = [
    "function available(string name) view returns(bool)",
];

const MAX_SUGGESTIONS = 5;

const suggestBasenameAlternativesAction: Action = {
    name: "SUGGEST_BASENAME_ALTERNATIVES",
    description:
        "Suggests available alternative Basenames using the LLM if the requested one is taken.",
    validate: async () => true,
    similes: ["SUGGEST_ALTERNATIVES", "ALTERNATIVES", "ALTERNATE_NAMES"],
    examples: [
        [
            {
                user: "{{user}}",
                content: { text: "Suggest alternatives for 'charlie.base'" },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        const basename = message.content.parameters.basename as string;
        const maxSuggestions = message.content.parameters.max_suggestions
            ? Math.min(Number(message.content.parameters.max_suggestions), 10)
            : MAX_SUGGESTIONS;

        if (!basename || !/^[a-z0-9\-]{3,32}$/.test(basename)) {
            await callback?.({
                text: "Please provide a valid basename to suggest alternatives.",
            });
            return;
        }

        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const registrarController = new ethers.Contract(
            REGISTRAR_CONTROLLER_ADDRESS,
            REGISTRAR_CONTROLLER_ABI,
            provider
        );

        // Check if requested Basename is available
        const isAvailable = await registrarController.available(basename);
        if (isAvailable) {
            await callback?.({
                requested: basename,
                available: true,
                alternatives: [],
                message: `'${basename}.base' is available!`,
            });
            return;
        }

        // Use Moxie LLM to generate alternatives
        const llmPrompt = `Suggest up to ${maxSuggestions} alternative Basenames similar to "${basename}" for a blockchain username. Only use lowercase letters, numbers, or hyphens. Do not include ".base".`;
        const llmResponse = await runtime.llm.complete(llmPrompt); // <-- Replace with actual LLM call

        const suggestions = llmResponse
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter((s) => /^[a-z0-9\-]{3,32}$/.test(s))
            .slice(0, maxSuggestions);

        // Check which suggestions are available
        const availableAlternatives: string[] = [];
        for (const alt of suggestions) {
            try {
                if (await registrarController.available(alt)) {
                    availableAlternatives.push(alt);
                }
                if (availableAlternatives.length >= maxSuggestions) break;
            } catch (e) {
                // Ignore errors for individual checks
            }
        }

        let message: string;
        if (availableAlternatives.length === 0) {
            message = `Sorry, '${basename}.base' is taken and no similar alternatives are currently available.`;
        } else {
            message =
                `'${basename}.base' is taken. Here are some available alternatives:\n` +
                availableAlternatives.map((a) => `- ${a}.base`).join("\n");
        }

        await callback?.({
            requested: basename,
            available: false,
            alternatives: availableAlternatives,
            message,
        });
    },
};

export default suggestBasenameAlternativesAction;
