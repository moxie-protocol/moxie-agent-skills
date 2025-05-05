import { elizaLogger } from "@senpi-ai/core";
import { SenpiUser } from "./types";
export interface GetPluginTokenGateInput {
    currentUserMoxieId: string;
    senpiIds: string[];
}

export interface PluginToken {
    fanTokenSymbol: string;
    fanTokenName: string;
    requiredTokens: number;
    priceOfTheTokenInMoxie: number;
    currentUserMoxieId: string;
    minTokenRequiredForCreator: number;
    currentBalance: number;
    creatorMoxieId: string;
    requiredSenpiAmountInUSD: number;
}

interface GetPluginTokenGateResponse {
    data: {
        PluginTokenGate: {
            tokens: PluginToken[];
        };
    };
}

export async function fetchPluginTokenGate(
    input: GetPluginTokenGateInput
): Promise<PluginToken[]> {
    elizaLogger.info(
        "[fetchPluginTokenGate-TokenGate] fetching plugin token gate for user:",
        input.currentUserMoxieId,
        "with senpiIds:",
        input.senpiIds
    );
    const query = `
        query GetPluginTokenGateData($currentUserMoxieId: String!, $usdcIds: [String!]!) {
            PluginTokenGate(input: { currentUserMoxieId: $currentUserMoxieId, senpiIds: $usdcIds }) {
                tokens {
                    fanTokenSymbol
                    fanTokenName
                    requiredTokens
                    priceOfTheTokenInMoxie
                    currentUserMoxieId
                    minTokenRequiredForCreator
                    currentBalance
                    creatorMoxieId
                    requiredSenpiAmountInUSD
                }
            }
        }
    `;

    try {
        const response = await fetch(process.env.SENPI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: {
                    currentUserMoxieId: input.currentUserMoxieId,
                    senpiIds: input.senpiIds,
                },
            }),
        });

        const result: GetPluginTokenGateResponse = await response.json();
        const data = result.data.PluginTokenGate.tokens;
        if (!data || data.length === 0) {
            elizaLogger.error(
                "[fetchPluginTokenGate] no tokens found for the given requested senpiIds:",
                input.senpiIds,
                "for user:",
                input.currentUserMoxieId
            );
            if (input.senpiIds.length > 0) {
                throw new Error(
                    "No Eligible tokens found for the given requested senpiIds"
                );
            }
        }
        return data;
    } catch (error) {
        elizaLogger.error("Error in fetchPluginTokenGate:", error);
        throw error;
    }
}

export async function validateSenpiUserTokens(
    senpiUserInfo: SenpiUser,
    message: any
): Promise<string> {
    const requestedSenpiUserIds = (
        message.content.text.match(/@\[[\w\.-]+\|M\d+\]/g) || []
    ).map((match) => match.split("|")[1].replace("]", ""));

    let textResponse = "";

    if (requestedSenpiUserIds.length > 0) {
        try {
            const pluginTokenGateResponses = await fetchPluginTokenGate({
                currentUserMoxieId: senpiUserInfo.id,
                senpiIds: requestedSenpiUserIds,
            });

            for (const pluginTokenGate of pluginTokenGateResponses) {
                if (pluginTokenGate.requiredTokens > 0) {
                    textResponse += `User needs at least ${pluginTokenGate.requiredTokens} tokens to ask a question for @[${pluginTokenGate.fanTokenName}|${pluginTokenGate.creatorMoxieId}] \n`;
                }
            }
        } catch (error) {
            elizaLogger.error("Error in validateSenpiUserTokens:", error);
            return "Error validating tokens: " + error.message;
        }
    }

    return textResponse;
}

function roundToDecimalPlaces(num: number, decimalPlaces: number): number {
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
