import { ethers } from "ethers";
import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";

const REGISTRAR_CONTROLLER_ADDRESS =
    "0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5";
const REGISTRAR_CONTROLLER_ABI = [
    "function available(string name) view returns(bool)",
];

const queryBasenameAvailabilityAction: Action = {
    name: "QUERY_BASENAME_AVAILABILITY",
    similes: ["CHECK_BASENAME", "IS_BASENAME_AVAILABLE", "VERIFY_BASENAME"],
    description: "Checks if a given Basename is available for registration.",
    examples: [
        [
            {
                user: "{{user}}",
                content: { text: "Is 'charlie.base' available?" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "'charlie.base' is available for registration.",
                },
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
        // Added explicit input validation
        if (!basename || !/^[a-z0-9\-]{3,32}$/.test(basename)) {
            await callback?.({
                text: "Please provide a valid basename to check availability.",
            });
            return;
        }
        try {
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            const registrarController = new ethers.Contract(
                REGISTRAR_CONTROLLER_ADDRESS,
                REGISTRAR_CONTROLLER_ABI,
                provider
            );
            const isAvailable: boolean =
                await registrarController.available(basename);
            // Changed: structured output
            await callback?.({
                basename,
                available: isAvailable,
                message: isAvailable
                    ? `'${basename}.base' is available for registration.`
                    : `'${basename}.base' is already registered.`,
            });
        } catch (error) {
            // User-facing error message and logging
            await callback?.({
                text: `An error occurred while checking basename availability: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`,
            });
            console.error("Error in queryBasenameAvailabilityAction:", error); // Added logging
        }
    },
};

export default queryBasenameAvailabilityAction;
