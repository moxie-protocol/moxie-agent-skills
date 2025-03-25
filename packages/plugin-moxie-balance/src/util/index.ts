import {
    IAgentRuntime,
    Memory,
    Actor,
    Content,
    formatTimestamp,
    elizaLogger
} from "@moxie-protocol/core";
import { MoxieUser } from "@moxie-protocol/moxie-agent-lib";
import { ErrorDetails } from "@moxie-protocol/moxie-agent-lib/src/services/types";
const CACHE_EXPIRATION = 120000; // 2 minutes in milliseconds

import { FREEMIUM_TRENDING_CREATORS } from "./config";
import { fetchPluginTokenGate } from "@moxie-protocol/moxie-agent-lib";
import { UUID } from "@moxie-protocol/core";

const FREEMIUM_TRENDING_CREATORS_LIST = FREEMIUM_TRENDING_CREATORS
    ? FREEMIUM_TRENDING_CREATORS.split(",")
    : [];

export async function setMoxieCache(
    data: string,
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<void> {
    await runtime.cacheManager.set(cacheKey, data, {
        expires: Date.now() + CACHE_EXPIRATION,
    });
}

export async function getMoxieCache(
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<string | null> {
    return await runtime.cacheManager.get(cacheKey);
}

/**
 * Gets all wallet addresses associated with a user, including vesting contracts
 */
export async function getWalletAddresses(userInfo: MoxieUser) {
    const addresses =
        userInfo.wallets.map((wallet) => wallet?.walletAddress) || [];
    const vestingAddresses =
        userInfo.vestingContracts?.map(
            (contract) => contract?.vestingContractAddress
        ) || [];
    return [...addresses, ...vestingAddresses];
}

export async function getMoxieToUSD() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=moxie&vs_currencies=usd"
        );
        const data = await response.json();
        return data.moxie.usd;
    } catch (error) {
        // Fallback value if API call fails
        return 0.00415299;
    }
}

export function getCommonHoldings(
    moxieUserInfoMultiple: MoxieUser[],
    portfolioSummaries: any
) {
    const commonFanTokenHoldings = {};
    const commonTokenHoldings = {};

    for (const user of moxieUserInfoMultiple) {
        if (portfolioSummaries[user.userName]) {
            for (const portfolio of portfolioSummaries[user.userName]
                .fanTokenHoldings) {
                if (!commonFanTokenHoldings[portfolio.fanTokenSymbol]) {
                    const key = `${user.userName}`;
                    commonFanTokenHoldings[portfolio.fanTokenSymbol] = {
                        [key]: {
                            dollarValue: portfolio.totalTvlInUSD,
                            amount: portfolio.totalAmount,
                        },
                        displayLabel: portfolio.displayLabel,
                    };
                } else {
                    const key = `${user.userName}`;
                    commonFanTokenHoldings[portfolio.fanTokenSymbol][key] = {
                        dollarValue: portfolio.totalTvlInUSD,
                        amount: portfolio.totalAmount,
                    };
                    commonFanTokenHoldings[
                        portfolio.fanTokenSymbol
                    ].displayLabel = portfolio.displayLabel;
                }
                if (
                    portfolioSummaries[user.userName]?.tokenHoldings?.length > 0
                ) {
                    for (const token of portfolioSummaries[user.userName]
                        .tokenHoldings) {
                        if (!commonTokenHoldings[token.tokenSymbol]) {
                            const key = `${user.userName}`;
                            commonTokenHoldings[token.tokenSymbol] = {
                                [key]: {
                                    dollarValue: token.balanceUSD,
                                    amount: token.balance,
                                },
                            };
                        } else {
                            const key = `${user.userName}`;
                            commonTokenHoldings[token.tokenSymbol][key] = {
                                dollarValue: token.balanceUSD,
                                amount: token.balance,
                            };
                        }
                    }
                }
            }
        }
    }
    const filteredCommonFanTokenHoldings = Object.fromEntries(
        Object.entries(commonFanTokenHoldings).filter(
            ([symbol, holdings]) => Object.keys(holdings).length > 2
        )
    );
    const filteredCommonTokenHoldings = Object.fromEntries(
        Object.entries(commonTokenHoldings).filter(
            ([symbol, holdings]) => Object.keys(holdings).length > 1
        )
    );
    return { filteredCommonFanTokenHoldings, filteredCommonTokenHoldings };
}

export function roundToDecimalPlaces(
    num: number,
    decimalPlaces: number
): number {
    // Convert to string to check decimal places
    const numStr = num.toString();

    // Check if the number has a decimal point
    if (numStr.includes(".")) {
        const decimalPart = numStr.split(".")[1];

        // If decimal part has more than 4 digits, round up to 4 decimal places
        if (decimalPart.length > decimalPlaces) {
            // Use Math.ceil with appropriate multiplier/divisor to round up to 4 decimal places
            return Math.ceil(num * 10000) / 10000;
        }
    }

    // Return original number if it has 4 or fewer decimal places
    return num;
}

export async function handleIneligibleMoxieUsers(ineligibleMoxieUsers: ErrorDetails[], callback, breakLine = false) {
    const messageParts = [];

    if (breakLine === true) {
        messageParts.push("\n");
        messageParts.push("\n");
    }

    if (ineligibleMoxieUsers.length == 1) {
        const userprofileLinkText = `[@${ineligibleMoxieUsers[0].requestedUserName}](https://moxie.xyz/profile/${ineligibleMoxieUsers[0].requestedId})`;

        let remainingNoOfTokensToBuy = ineligibleMoxieUsers[0].expectedCreatorCoinBalance - ineligibleMoxieUsers[0].actualCreatorCoinBalance;
        if (remainingNoOfTokensToBuy < 0) {
            remainingNoOfTokensToBuy = 0;
        }

        if (breakLine === true) {
            if (ineligibleMoxieUsers[0].actualCreatorCoinBalance > 0) {
                messageParts.push(`I can also get you that portfolio on ${userprofileLinkText}, but you’ll need some ${userprofileLinkText} coins to unlock it.\n\n`);
            } else {
                messageParts.push(`I can also get you that portfolio analysis on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their data coins to unlock it.\n\n`);
            }
        } else {
            messageParts.push(`I can get you that portfolio analysis on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their data coins to unlock it.\n\n`);
        }
        if (ineligibleMoxieUsers[0].actualCreatorCoinBalance > 0) {
            messageParts.push(`It costs ${remainingNoOfTokensToBuy} (~$${roundToDecimalPlaces(ineligibleMoxieUsers[0].requiredMoxieAmountInUSD, 2)}) ${userprofileLinkText} to access, and right now, you have only ${ineligibleMoxieUsers[0].actualCreatorCoinBalance} ${userprofileLinkText} in your wallet. Want me to grab them for you now? Just say the word, and I’ll handle it! 🚀`);
        } else {
            messageParts.push(`It costs ~$${roundToDecimalPlaces(ineligibleMoxieUsers[0].requiredMoxieAmountInUSD, 2)} for lifetime access. Do you want me to buy it for you?`);
        }

        for (const part of messageParts) {
            callback({ text: part  });
        }
    } else if (ineligibleMoxieUsers.length > 1) {
        const userLinks = ineligibleMoxieUsers.map((user) => `[@${user.requestedUserName}](https://moxie.xyz/profile/${user})`).join(", ");

        if (breakLine === true) {
            messageParts.push(`I can also get you that portfolio on ${userLinks} - we just need to grab some of their coins first. Head over to the skill page and you can easily add them! `);
        } else {
            messageParts.push(`I can get you that portfolio on ${userLinks} - we just need to grab some of their coins first. Head over to the skill page and you can easily add them! `);
        }
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    } else {
        messageParts.push("You should own some creator coins to access this feature. Head over to the skill page and you can easily add them!");
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    }
}

export const formatMessages = ({
    agentId,
    messages,
    actors,
}: {
    agentId: UUID;
    messages: Memory[];
    actors: Actor[];
}) => {
    const messageStrings = messages
        .filter(
            (message: Memory) => message.userId && message.userId !== agentId
        )
        .map((message: Memory) => {
            const messageContent = (message.content as Content).text;
            const messageAction = (message.content as Content).action;
            const formattedName =
                actors.find((actor: Actor) => actor.id === message.userId)
                    ?.name || "Unknown User";

            const attachments = (message.content as Content).attachments;

            const timestamp = formatTimestamp(message.createdAt);

            const shortId = message.userId.slice(-5);

            return `(${timestamp}) [${shortId}] ${formattedName}: ${messageContent}${messageAction && messageAction !== "null" ? ` (${messageAction})` : ""}`;
        })
        .join("\n");
    return messageStrings;
};
