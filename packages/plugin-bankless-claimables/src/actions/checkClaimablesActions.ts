import {
    elizaLogger,
    type Action,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@moxie-protocol/core";
import axios from "axios";
import { MoxieUser } from "@moxie-protocol/moxie-agent-lib";

const BANKLESS_API_KEY = process.env.BANKLESS_API_KEY;

const checkClaimablesAction: Action = {
    name: "CHECK_AVAILABLE_CLAIMABLES",
    similes: [
        "CHECK_CLAIMABLES",
        "AVAILABLE_CLAIMABLES",
        "CLAIMABLE_AIRDROPS",
        "FETCH_CLAIMABLES",
        "LIST_MY_CLAIMABLES",
        "SHOW_ME_MY_CLAIMABLES",
    ],
    description:
        "Scans all connected agent wallets in real time to detect claimable airdrops using the Bankless Claimables API, delivering users actionable insights and direct claim links.",
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Check my wallets for any available airdrops.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You have 2 claimable airdrops:\n\nDEGEN Airdrop: 568508 DEGEN tokens (worth $12,328 USD)\n[Claim Now](https://www.degen.tips/airdrop2/season2)",
                },
            },
        ],
    ],

    validate: async () => Boolean(process.env.BANKLESS_API_KEY),

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State,
        options?: Record<string, unknown>,
        callback?: HandlerCallback
    ) => {
        const traceId = message.id;
        const moxieUserId = (state?.moxieUserInfo as MoxieUser)?.id;
        try {
            const wallets =
                (state?.moxieUserInfo as MoxieUser)?.wallets?.filter(
                    (w) => w.walletType !== "embedded"
                ) ?? [];

            if (!wallets.length) {
                await callback?.({
                    text: "No connected wallets found. Please ensure that you have connected your wallets and have your agent wallet configured.",
                });
                return true;
            }

            const tableRows: string[] = [];
            const claimables = [];

            // Add table header
            tableRows.push(
                "| Name  | Type | Wallet | Claimable Value | Claim Link |"
            );
            tableRows.push(
                "|--------|--------|---------|--------|------------|"
            );

            elizaLogger.info(
                `[checkAirdropsAction] [${traceId}] [${moxieUserId}] Found ${JSON.stringify(wallets)}`
            );

            for (const wallet of wallets) {
                const walletAddress = wallet.walletAddress;
                const res = await axios.get(
                    `https://api.bankless.com/claimables/${walletAddress}`,
                    {
                        headers: {
                            "X-BANKLESS-TOKEN": BANKLESS_API_KEY || "",
                            Accept: "application/json",
                        },
                    }
                );

                if (!Array.isArray(res?.data) || res?.data?.length === 0) {
                    continue;
                }

                claimables.push(...res.data);
            }

            elizaLogger.info(
                `[checkAirdropsAction] [${traceId}] [${moxieUserId}] Found ${claimables?.[0]} claimables`
            );

            // Filter for unclaimed only and take top 10
            const unclaimedClaimables = claimables
                .filter(
                    (item) => item.claimStatus.toLowerCase() === "unclaimed"
                )
                .sort(
                    (a, b) =>
                        (b?.worth?.worthUSDFloat ?? 0) -
                        (a?.worth?.worthUSDFloat ?? 0)
                )
                .slice(0, 10);

            unclaimedClaimables.forEach((item) => {
                const { walletAddress, title, type, worth } = item;
                const url = `https://bankless.com/claimables/${walletAddress}`;

                tableRows.push(
                    `| ${title} | ${type.charAt(0).toUpperCase() + type.slice(1)} | ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} | ${
                        worth?.worthUSDString ?? "N/A"
                    } | ${url} |`
                );
            });

            await callback?.({
                text:
                    `You have in total ${unclaimedClaimables.length} claimables to claim amounting to ${unclaimedClaimables.reduce((acc, item) => acc + (item.worth?.worthUSDFloat ?? 0), 0).toFixed(2)} USD across ${wallets.length} connected wallets. Here are the top ${unclaimedClaimables.length > 10 ? 10 : unclaimedClaimables.length} claimables:\n\n` +
                    tableRows.join("\n") +
                    (unclaimedClaimables?.length > 10
                        ? `\n\nClick [here](https://claimables.bankless.com/claimables/${moxieUserId}) to view all your claimables.`
                        : "") +
                    `\n\nFeel free to connect more wallets to see more claimables that you may have missed.\n\n**Note:** You will need to go to the Bankless Claimables links and connect your wallet on the site to claim your claimables.`,
            });

            return true;
        } catch (error) {
            elizaLogger.error(
                `[checkAirdropsAction] [${traceId}] [${moxieUserId}] Error checking airdrops: ${error}`
            );
            const message =
                error?.response?.status === 429
                    ? "Rate limit hit. Please wait and try again."
                    : "Sorry, there was an error retrieving your claimable airdrops. Please try again later.";

            await callback?.({ text: message });
            return false;
        }
    },
};

export default checkClaimablesAction;
