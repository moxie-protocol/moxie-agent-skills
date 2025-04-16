import { ethers } from "ethers";
import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";

const REGISTRAR_CONTROLLER_ADDRESS =
    "0x4cCb0BB02FCABA27e82a56646E81d8c5bC4119a5";
const REGISTRAR_CONTROLLER_ABI = [
    "function available(string name) view returns(bool)",
    "function rentPrice(string name, uint256 duration) view returns(uint256)",
    "function register(string calldata name, address owner, uint256 duration, bytes32 secret) payable",
];

const registerBasenameAction: Action = {
    name: "REGISTER_BASENAME",
    similes: ["REGISTER_NAME", "BUY_BASENAME", "ACQUIRE_BASENAME"],
    description:
        "Registers a Basename if available, after presenting cost and receiving user confirmation.",
    examples: [
        [
            {
                user: "{{user}}",
                content: { text: "Register 'charlie.base' for 1 year." },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "This basename is available and costs 0.05 ETH to register for 1 year, would you like to register it?",
                },
            },
            { user: "{{user}}", content: { text: "Yes." } },
            {
                user: "{{agent}}",
                content: {
                    text: "Registration initiated successfully, transaction hash: 0xabc123...",
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
        const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        const agentWallet = state.agentWallet as MoxieWalletClient;
        const registrarController = new ethers.Contract(
            REGISTRAR_CONTROLLER_ADDRESS,
            REGISTRAR_CONTROLLER_ABI,
            provider
        );

        // Obtain memory manager clearly from runtime
        const memoryManager = runtime.getMemoryManager("basenameRegistrations");
        const memoryKey = `basenameRegistration:${agentWallet.userId}`;
        const ongoingRegistration = await memoryManager.get(memoryKey);

        if (ongoingRegistration) {
            // STEP 2: User confirmation handling
            if (message.content.text.trim().toLowerCase() !== "yes") {
                await callback?.({ text: "Registration cancelled." }); // User-facing message
                await memoryManager.delete(memoryKey);
                return;
            }
            const { basename, duration, cost } = ongoingRegistration;
            // Ensure the wallet has enough ETH
            const balance = await provider.getBalance(
                agentWallet.walletAddress
            );
            if (balance < BigInt(cost)) {
                await callback?.({
                    text: "Insufficient funds in your wallet for this transaction.",
                }); // User-facing message
                await memoryManager.delete(memoryKey);
                return;
            }
            // Execute the transaction
            try {
                const tx = await agentWallet.sendTransaction("eip155:8453", {
                    toAddress: REGISTRAR_CONTROLLER_ADDRESS,
                    data: registrarController.interface.encodeFunctionData(
                        "register",
                        [
                            basename,
                            agentWallet.walletAddress,
                            duration,
                            ethers.ZeroHash,
                        ]
                    ),
                    value: cost.toString(),
                });
                await callback?.({
                    tx_hash: tx.hash, // Changed: explicit output field
                    message: `Registration initiated successfully, transaction hash: ${tx.hash}`,
                });
            } catch (error) {
                await callback?.({
                    text: `Error during registration: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
                console.error("Error during registration:", error); // Added logging
            }
            await memoryManager.delete(memoryKey);
        } else {
            // STEP 1: Initial availability and cost prompt
            const basename = message.content.parameters.basename as string;
            const durationYears = parseInt(
                message.content.parameters.duration as string,
                10
            );

            // Added input validation
            if (
                !basename ||
                !/^[a-z0-9\-]{3,32}$/.test(basename) ||
                isNaN(durationYears) ||
                durationYears < 1 ||
                durationYears > 5
            ) {
                await callback?.({
                    text: "Please provide a valid basename and duration.",
                });
                return;
            }
            const duration = durationYears * 31536000; // 1 year in seconds

            const available = await registrarController.available(basename);
            if (!available) {
                await callback?.({
                    text: `'${basename}.base' is already registered.`,
                });
                return;
            }
            const cost = await registrarController.rentPrice(
                basename,
                duration
            );
            const costInETH = ethers.formatEther(cost);

            // Store prompt details in memory manager
            await memoryManager.set(memoryKey, {
                basename,
                duration,
                cost: cost.toString(),
            });
            // Changed: explicit output structure for prompt
            await callback?.({
                basename,
                duration: durationYears,
                cost: cost.toString(),
                cost_eth: costInETH,
                message: `'${basename}.base' is available and costs ${costInETH} ETH to register for ${durationYears} year(s). Reply 'Yes' to confirm.`,
            });
        }
    },
};

export default registerBasenameAction;
