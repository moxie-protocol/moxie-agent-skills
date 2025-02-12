import {
    composeContext,
    elizaLogger,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@moxie-protocol/core";
import { fanTokenTrendsExamples } from "./examples";
import { fanTokenTrendsTemplate } from "./template";
import { Portfolio, SubjectTokenDailySnapshot } from "../../types";
import { getSubjectTokenDailySnapshots } from "../../services/subgraphService";
import { MoxieUser } from "@moxie-protocol/moxie-lib";
import {
    extractTokenInsights,
    getMoxieCache,
    getTimeRange,
    getTokenMap,
    getTokenMap,
    getTokenMap,
    setMoxieUserIdCache,
} from "../../util";
import { getPortfolioData } from "../../services/zapperService";

export default {
    name: "CREATOR_COIN_TRENDS",
    similes: [
        "TOKEN_TRENDS",
        "CREATOR_COIN_TRENDS",
        "FAN_TOKEN_PERFORMANCE",
        "CREATOR_COIN_PERFORMANCE",
    ],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("[FanTokenTrends] Validating request");
        return true;
    },
    description:
        "Get detailed trend analysis for specific fan/creator tokens over a time period",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("[FanTokenTrends] Starting trends analysis");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const moxieUserInfo: MoxieUser = state.moxieUserInfo;
        console.log(
            "[wallet?.walletAddress]",
            JSON.stringify(moxieUserInfo?.wallets?.[0]?.walletAddress)
        );
        const walletAddresses = moxieUserInfo.wallets.map(
            (wallet) => wallet?.walletAddress
        );

        if (!walletAddresses) {
            callback({
                text: "Please specify a fan token address to analyze trends",
            });
            return false;
        }

        try {
            const fanTokenAddresses = await getFanTokenAddresses(
                walletAddresses,
                ["BASE_MAINNET"],
                runtime,
                moxieUserInfo,
                message.content.text
            );
            const { startTime, endTime } = getTimeRange(21);
            console.log(
                "[FanTokenTrends] fanTokenAddresses==>",
                message.content.text
            );

            const subjectTokenDailySnapshots =
                await getSubjectTokenDailySnapshots(
                    fanTokenAddresses,
                    startTime,
                    endTime
                );

            console.log(
                "[FanTokenTrends] [subjectTokenDailySnapshots]",
                JSON.stringify(subjectTokenDailySnapshots)
            );

            if (
                !subjectTokenDailySnapshots ||
                subjectTokenDailySnapshots.length === 0
            ) {
                callback({
                    text: "No trend data available for this token",
                });
                return false;
            }

            const newstate = await runtime.composeState(message, {
                subjectTokenDailySnapshots: JSON.stringify(
                    subjectTokenDailySnapshots
                ),
                message: message.content.text,
            });

            const context = composeContext({
                state: newstate,
                template: fanTokenTrendsTemplate,
            });

            const response = await generateText({
                runtime: runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            await callback({ text: response });
            return true;
        } catch (error) {
            elizaLogger.error(
                "[FanTokenTrends] Error analyzing trends:",
                error
            );
            callback({
                text: `Error analyzing trends: ${error.message}`,
                content: { error: error.message },
            });
            return false;
        }
    },
    examples: fanTokenTrendsExamples,
    template: fanTokenTrendsTemplate,
} as Action;

async function getFanTokenAddresses(
    walletAddresses: string[],
    networks: string[],
    runtime: IAgentRuntime,
    moxieUserInfo: MoxieUserInfo,
    message: String
): Promise<string[]> {
    const fanTokenAddressesCacheKey = `fanTokenAddresses-${moxieUserInfo?.id}`;
    const cachedFanTokenAddresses = await getMoxieCache(
        fanTokenAddressesCacheKey,
        runtime
    );
    let fanTokenAddresses: string[];

    if (cachedFanTokenAddresses) {
        elizaLogger.log(
            "[getFanTokenAddresses] Using cached fan token addresses"
        );
        fanTokenAddresses = JSON.parse(cachedFanTokenAddresses as string);
    } else {
        const cacheKey = `portfolio-${moxieUserInfo?.id}`;
        const cachedPortfolio = await getMoxieCache(cacheKey, runtime);
        let portfolioData: Portfolio;

        if (cachedPortfolio) {
            elizaLogger.log("[getFanTokenAddresses] Using cached portfolio");
            portfolioData = JSON.parse(cachedPortfolio as string);
        } else {
            portfolioData = await getPortfolioData(walletAddresses, networks);
            setMoxieUserIdCache(
                JSON.stringify(portfolioData),
                cacheKey,
                runtime
            );
        }

        const filteredBalances = portfolioData?.appBalances.filter(
            (balance) => balance.appId === "moxie-protocol"
        );
        const allAddresses = [];

        for (const balance of filteredBalances) {
            for (const product of balance.products) {
                for (const asset of product.assets) {
                    if (asset?.displayProps?.label) {
                        // split label by space
                        const labelParts = asset.displayProps.label
                            .toLowerCase()
                            .split(" ");
                        // remove brackets from label
                        const cleanedParts = labelParts.map((part) =>
                            part.replace(/[\(\)]/g, "")
                        );
                        if (
                            cleanedParts.some((part) =>
                                message?.toLowerCase().includes(part)
                            )
                        ) {
                            allAddresses.push(asset.address);
                        }
                    }
                }
            }
        }

        fanTokenAddresses = [...new Set(allAddresses)];

        setMoxieUserIdCache(
            JSON.stringify(fanTokenAddresses),
            fanTokenAddressesCacheKey,
            runtime
        );
    }

    return fanTokenAddresses;
}
