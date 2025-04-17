import {
    elizaLogger,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@moxie-protocol/core";
import { MoxieUser } from "@moxie-protocol/moxie-agent-lib";
import { getBasename, getBasenameExpiry } from "../utils/basenames";

const viewOwnedBasenamesAction: Action = {
    name: "VIEW_OWNED_BASENAMES",
    similes: ["SHOW_BASENAMES", "MY_BASENAMES", "LIST_BASENAMES"],
    description: "Retrieve all Basenames owned by connected user wallets.",
    validate: async () => true,
    examples: [
        [
            { user: "{{user}}", content: { text: "Show my basenames." } },
            {
                user: "{{agent}}",
                content: { text: "Here's a table of your owned basenames." },
            },
        ],
    ],
    suppressInitialMessage: true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {
            const walletAddresses = (
                state.moxieUserInfo as MoxieUser
            ).wallets.map((wallet) => wallet.walletAddress);
            const allOwnedBasenames = [];
            // Note: This need to change by using Zapper API (or other NFT API to get the tokenId)
            for (const address of walletAddresses) {
                const basename = await getBasename(address as `0x${string}`);
                if (basename) {
                    const expiry = await getBasenameExpiry(basename);
                    elizaLogger.info(
                        "Owned basename:",
                        address,
                        basename,
                        expiry
                    );
                    allOwnedBasenames.push({
                        address,
                        basename,
                        expiry,
                    });
                }
            }
            if (allOwnedBasenames.length === 0) {
                await callback?.({
                    text: "You don't currently own any Basenames.",
                });
                return true;
            }
            await callback?.({
                text:
                    `You have ${allOwnedBasenames.length} basenames registered:\n\n` +
                    `| Basename | Address | Expiry Date |\n` +
                    `|---------|----------|-------------|\n` +
                    allOwnedBasenames
                        .map(
                            (b) =>
                                `|${b.basename} | ${b.address} | ${new Date(Number(b.expiry) * 1000).toDateString()} |`
                        )
                        .join("\n"),
            });

            return true;
        } catch (error) {
            await callback?.({
                text: `Sorry, there was an error fetching your Basenames: ${error instanceof Error ? error.message : "Unknown error"}`,
            });
            elizaLogger.error("Error in viewOwnedBasenamesAction:", error); // Added logging
        }
    },
};

export default viewOwnedBasenamesAction;
