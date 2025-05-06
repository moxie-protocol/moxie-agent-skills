import {
    IAgentRuntime,
    Memory,
    Actor,
    Content,
    formatTimestamp,
    elizaLogger,
} from "@senpi-ai/core";
import { SenpiUser } from "@senpi-ai/senpi-agent-lib";
import { ErrorDetails } from "@senpi-ai/senpi-agent-lib/src/services/types";
const CACHE_EXPIRATION = 120000; // 2 minutes in milliseconds

import { FREEMIUM_TRENDING_CREATORS } from "./config";
import { fetchPluginTokenGate } from "@senpi-ai/senpi-agent-lib";
import { UUID } from "@senpi-ai/core";

const FREEMIUM_TRENDING_CREATORS_LIST = FREEMIUM_TRENDING_CREATORS
    ? FREEMIUM_TRENDING_CREATORS.split(",")
    : [];

export async function setSenpiCache(
    data: string,
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<void> {
    await runtime.cacheManager.set(cacheKey, data, {
        expires: Date.now() + CACHE_EXPIRATION,
    });
}

export async function getSenpiCache(
    cacheKey: string,
    runtime: IAgentRuntime
): Promise<string | null> {
    return await runtime.cacheManager.get(cacheKey);
}

/**
 * Gets all wallet addresses associated with a user, including vesting contracts
 */
export async function getWalletAddresses(userInfo: SenpiUser) {
    const addresses =
        userInfo.wallets.map((wallet) => wallet?.walletAddress) || [];
    const vestingAddresses =
        userInfo.vestingContracts?.map(
            (contract) => contract?.vestingContractAddress
        ) || [];
    return [...addresses, ...vestingAddresses];
}

export async function getSenpiToUSD() {
    try {
        const response = await fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=senpi&vs_currencies=usd"
        );
        const data = await response.json();
        return data.senpi.usd;
    } catch (error) {
        // Fallback value if API call fails
        return 0.00415299;
    }
}

export function getCommonHoldings(
    senpiUserInfoMultiple: SenpiUser[],
    portfolioSummaries: any
) {
    const commonFanTokenHoldings = {};
    const commonTokenHoldings = {};

    for (const user of senpiUserInfoMultiple) {
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

export async function handleIneligibleSenpiUsers(
    ineligibleSenpiUsers: ErrorDetails[],
    callback,
    breakLine = false
) {
    const messageParts = [];

    if (breakLine === true) {
        messageParts.push("\n");
        messageParts.push("\n");
    }

    if (ineligibleSenpiUsers.length == 1) {
        const userprofileLinkText = `[@${ineligibleSenpiUsers[0].requestedUserName}](https://senpi.ai/profile/${ineligibleSenpiUsers[0].requestedId})`;

        let remainingNoOfTokensToBuy =
            ineligibleSenpiUsers[0].expectedCreatorCoinBalance -
            ineligibleSenpiUsers[0].actualCreatorCoinBalance;
        if (remainingNoOfTokensToBuy < 0) {
            remainingNoOfTokensToBuy = 0;
        }

        if (breakLine === true) {
            if (ineligibleSenpiUsers[0].actualCreatorCoinBalance > 0) {
                messageParts.push(
                    `I can also get you that portfolio on ${userprofileLinkText}, but you’ll need some ${userprofileLinkText} coins to unlock it.\n\n`
                );
            } else {
                messageParts.push(
                    `I can also get you that portfolio analysis on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their coins to unlock it.\n\n`
                );
            }
        } else {
            messageParts.push(
                `I can get you that portfolio analysis on ${userprofileLinkText}, but first you’ll need to buy ${remainingNoOfTokensToBuy} of their coins to unlock it.\n\n`
            );
        }
        if (ineligibleSenpiUsers[0].actualCreatorCoinBalance > 0) {
            messageParts.push(
                `It costs ${remainingNoOfTokensToBuy} (~$${roundToDecimalPlaces(ineligibleSenpiUsers[0].requiredSenpiAmountInUSD, 2)}) ${userprofileLinkText} to access, and right now, you have only ${ineligibleSenpiUsers[0].actualCreatorCoinBalance} ${userprofileLinkText} in your wallet. Want me to grab them for you now? Just say the word, and I’ll handle it! 🚀`
            );
        } else {
            messageParts.push(
                `It costs ~$${roundToDecimalPlaces(ineligibleSenpiUsers[0].requiredSenpiAmountInUSD, 2)} for lifetime access. Do you want me to buy it for you?`
            );
        }

        for (const part of messageParts) {
            callback({ text: part });
        }
    } else if (ineligibleSenpiUsers.length > 1) {
        const userLinks = ineligibleSenpiUsers
            .map(
                (user) =>
                    `[@${user.requestedUserName}](https://senpi.ai/profile/${user})`
            )
            .join(", ");

        if (breakLine === true) {
            messageParts.push(
                `I can also get you that portfolio on ${userLinks} - we just need to grab some of their coins first. Head over to the skill page and you can easily add them! `
            );
        } else {
            messageParts.push(
                `I can get you that portfolio on ${userLinks} - we just need to grab some of their coins first. Head over to the skill page and you can easily add them! `
            );
        }
        for (const part of messageParts) {
            callback({ text: part, cta: "GO_TO_SKILL_PAGE" });
        }
    } else {
        messageParts.push(
            "You should own some creator coins to access this feature. Head over to the skill page and you can easily add them!"
        );
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
