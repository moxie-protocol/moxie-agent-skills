import { ethers, namehash } from "ethers";
import type {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@moxie-protocol/core";
import {
    MoxieWalletClient,
    getUserByMoxieId,
} from "@moxie-protocol/moxie-agent-lib";

// ABI for BaseRegistrar and Base Mainnet verified contract address
const BASENAMES_CONTRACT_ADDRESS = "0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a";
const L2_RESOLVER_ADDRESS = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";
const BASENAMES_ABI = [
    "function nameExpires(uint256 id) view returns(uint256)",
    "function ownerOf(uint256 tokenId) view returns(address)",
    "function tokenOfOwnerByIndex(address owner, uint256 index) view returns(uint256)",
    "function balanceOf(address owner) view returns(uint256)",
];
const L2_RESOLVER_ABI = [
    "function name(bytes32 node) external view returns (string memory)",
];

async function resolveBasename(tokenId: string): Promise<string> {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const resolverContract = new ethers.Contract(
        L2_RESOLVER_ADDRESS,
        L2_RESOLVER_ABI,
        provider
    );
    try {
        const domainHash = namehash(`${tokenId}.base.eth`);
        const basename: string = await resolverContract.name(domainHash);
        return basename;
    } catch (error) {
        console.error(`Error resolving basename: ${error}`);
        throw new Error("Failed to resolve basename");
    }
}

const viewOwnedBasenamesAction: Action = {
    name: "VIEW_OWNED_BASENAMES",
    similes: ["SHOW_BASENAMES", "MY_BASENAMES", "LIST_BASENAMES"],
    description: "Retrieve all Basenames owned by connected user wallets.",
    examples: [
        [
            { user: "{{user}}", content: { text: "Show my basenames." } },
            {
                user: "{{agent}}",
                content: { text: "Here's a table of your owned basenames." },
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
        try {
            const agentWallet = state.agentWallet as MoxieWalletClient;
            // Fetch connected wallets
            const userData = await getUserByMoxieId(agentWallet.userId);
            const walletAddresses = userData.wallets.map(
                (wallet: any) => wallet.walletAddress
            );

            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
            const basenamesContract = new ethers.Contract(
                BASENAMES_CONTRACT_ADDRESS,
                BASENAMES_ABI,
                provider
            );
            const allOwnedBasenames = [];
            for (const address of walletAddresses) {
                // Validate wallet address format // Added validation
                if (!/^0x[a-fA-F0-9]{40}$/.test(address)) continue;
                const balance = await basenamesContract.balanceOf(address);
                for (let i = 0; i < balance; i++) {
                    const tokenId = await basenamesContract.tokenOfOwnerByIndex(
                        address,
                        i
                    );
                    const expiry = await basenamesContract.nameExpires(tokenId);
                    const basename = await resolveBasename(tokenId);
                    allOwnedBasenames.push({
                        wallet_address: address, // Renamed for explicit output mapping
                        basename,
                        expiry_date: new Date(Number(expiry) * 1000)
                            .toISOString()
                            .split("T")[0], // ISO 8601
                    });
                }
            }
            if (allOwnedBasenames.length === 0) {
                await callback?.({
                    text: "You don't currently own any Basenames.",
                }); // User-facing error message
                return;
            }
            // Output as array of objects for compliance
            await callback?.({ basenames: allOwnedBasenames }); // Changed: explicit output structure
        } catch (error) {
            await callback?.({
                text: `Sorry, there was an error fetching your Basenames: ${error instanceof Error ? error.message : "Unknown error"}`,
            }); // User-facing error message
            // Log error for audit
            console.error("Error in viewOwnedBasenamesAction:", error); // Added logging
        }
    },
};

export default viewOwnedBasenamesAction;
