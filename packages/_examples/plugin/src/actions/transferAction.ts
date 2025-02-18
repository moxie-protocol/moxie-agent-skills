import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
    type ActionExample,
    composeContext,
    generateObject,
    ModelClass,
} from "@moxie-protocol/core";
import {
    MoxieWalletClient,
    type MoxieWallet,
} from "@moxie-protocol/moxie-lib/src/wallet";
import { transferEthTemplate } from "../templates";
import { TransferEthSchema } from "../types";

export const transferAction: Action = {
    name: "TRANSFER_BASE_ETH",
    similes: ["TRANSFER_ETH_ON_BASE", "TRANSFER_NATIVE_ETH_ON_BASE"],
    description: "Transfer ETH on Base from one wallet to another",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            elizaLogger.log("Starting TRANSFER_BASE_ETH handler...");

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const context = composeContext({
                state,
                template: transferEthTemplate,
            });

            const transferDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: TransferEthSchema,
            });
            const { toAddress, amount: value } = transferDetails.object as {
                toAddress: string;
                amount: number;
            };

            elizaLogger.log(
                `Transfering ${value} wei to address ${toAddress}...`
            );
            const wallet = new MoxieWalletClient(
                (state.agentWallet as MoxieWallet).address
            );
            const { hash } = await wallet.sendTransaction("8543", {
                toAddress,
                value,
            });

            elizaLogger.success(
                `Transfer completed successfully! Transaction hash: ${hash}`
            );
            callback?.(
                {
                    text: `Transfer completed successfully! Transaction hash: ${hash}`,
                },
                []
            );
            return true;
        } catch (error) {
            elizaLogger.error("Error transfering Base ETH:", error);
            callback(
                { text: "Failed to transfer Base ETH. Please check the logs." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 0.01 ETH to 0x114B242D931B47D5cDcEe7AF065856f70ee278C4",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Transfer completed successfully! Transaction hash: 0xdde850f9257365fffffc11324726ebdcf5b90b01c6eec9b3e7ab3e81fde6f14b",
                    action: "TRANSFER_BASE_ETH",
                },
            },
        ],
    ] as ActionExample[][],
};
