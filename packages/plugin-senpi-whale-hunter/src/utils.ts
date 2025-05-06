import { DuneClient, QueryParameter } from "@duneanalytics/client-sdk";
import { DUNE_API_KEY, WHALE_HUNTER_QUERY_ID, BASE_RPC_URL } from "./config";
import {
    Actor,
    Content,
    Memory,
    UUID,
    formatTimestamp,
    elizaLogger,
    IAgentRuntime,
} from "@senpi-ai/core";
import { TokenHolderDuneResponse } from "./types/whales";
import { validateBaseEconomyTokenBalance } from "@senpi-ai/client-senpi";
import { ethers } from "ethers";

import { ftaService } from "@senpi-ai/senpi-agent-lib";
import { getSubjectTokenDetailsBySubjectAddress } from "./protocolSubgraph";

const client = new DuneClient(DUNE_API_KEY);

export async function getTopTokenHolders(
    tokenAddress: string,
    limit: number = 10
): Promise<TokenHolderDuneResponse[]> {
    try {
        const parameters = [
            QueryParameter.text("token_address", tokenAddress),
            QueryParameter.number("limit", limit),
        ];

        const result = await client.runQuery({
            queryId: 4809537,
            query_parameters: parameters,
        });
        const resultData = result.result
            .rows as unknown as TokenHolderDuneResponse[];

        elizaLogger.debug(
            `[getTopTokenHolders] Result: ${JSON.stringify(resultData)}`
        );

        return resultData || [];
    } catch (error) {
        elizaLogger.error(`[getTopTokenHolders] Error: ${error}`);
        throw error;
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

export async function extractTokenDetails(
    message: string,
    runtime: any
): Promise<{ tokenSymbol: string; tokenAddress: string } | null> {
    const regex = /\$\[([^|]+)\|([^\]]+)\]/;
    const match = message.match(regex);

    if (!match) {
        // check if there is user mention in the message
        const creatorDetails = extractCreatorDetails(message);
        if (!creatorDetails || !creatorDetails.userId) {
            return {
                tokenSymbol: null,
                tokenAddress: null,
            };
        }
        const ftaResponse = await getFtaResponses(
            [creatorDetails.userId],
            runtime
        );
        if (ftaResponse) {
            const subjectTokenDetails =
                await getSubjectTokenDetailsBySubjectAddress(
                    "",
                    ftaResponse[creatorDetails.userId].subjectAddress
                );
            if (subjectTokenDetails) {
                return {
                    tokenSymbol: subjectTokenDetails.symbol,
                    tokenAddress: subjectTokenDetails.id,
                };
            }
            return {
                tokenSymbol: null,
                tokenAddress: null,
            };
        }
    }

    return {
        tokenSymbol: match[1],
        tokenAddress: match[2],
    };
}

export async function verifyUserBaseEconomyTokenOwnership(
    senpiUserId: string,
    runtime: IAgentRuntime
): Promise<boolean> {
    let baseEconomyTokenBalance, hasSufficientBalance;
    try {
        ({ baseEconomyTokenBalance, hasSufficientBalance } =
            await validateBaseEconomyTokenBalance({ senpiUserId, runtime }));
    } catch (error) {
        elizaLogger.error(
            `[verifyUserBaseEconomyTokenOwnership] Error: ${error}`
        );
        throw error;
    }
    return hasSufficientBalance;
}

export function extractCreatorDetails(
    token: string
): { username: string; userId: string } | null {
    const regex = /@\[([^|]+)\|([^\]]+)\]/;
    const match = token.match(regex);

    if (!match) {
        return {
            username: null,
            userId: null,
        };
    }

    return {
        username: match[1],
        userId: match[2],
    };
}

/**
 * Fetches FTA responses for given creator IDs
 * @param creatorIds - Array of creator IDs to fetch FTA responses for
 * @param senpiUserId - The user ID of the person performing the swap
 * @param runtime - The runtime environment
 * @param callback - The callback function to receive status updates
 * @returns Promise that resolves to a record of creator IDs and their FTA responses
 */
async function getFtaResponses(
    creatorIds: string[],
    runtime: any
): Promise<Record<string, any>> {
    const ftaResponses: Record<string, any> = {};
    for (const creatorId of creatorIds) {
        const ftaResponse = await runtime.cacheManager.get(
            `userftadetails-${creatorId}`
        );
        if (ftaResponse) {
            elizaLogger.debug(
                `[whalePlugin] fta response fetched successfully from cache for creator senpi user id: ${creatorId}, ${JSON.stringify(ftaResponse)}`
            );
            ftaResponses[creatorId] = ftaResponse;
        } else {
            const newFtaResponse = await ftaService.getUserFtaData(creatorId);
            if (!newFtaResponse || newFtaResponse == null) {
                elizaLogger.error(
                    `[whalePlugin] fta response not found for creator ${creatorId}`
                );
                throw new Error(
                    `[whalePlugin] The creator with ID ${creatorId} could not be found. Please verify the creator ID`
                );
            }
            await runtime.cacheManager.set(
                `userftadetails-${creatorId}`,
                newFtaResponse
            );
            ftaResponses[creatorId] = newFtaResponse;
            elizaLogger.debug(
                `[whalePlugin] fta response fetched successfully for creator ${creatorId} and set in cache`
            );
        }
    }
    return ftaResponses;
}

const ERC20_ABI = ["function totalSupply() view returns (uint256)"];

/**
 * Fetches the total supply of an ERC-20 token on Base blockchain.
 * @param tokenAddress - The contract address of the token.
 * @returns Total supply as a BigNumber.
 */
export async function fetchTotalSupply(tokenAddress: string): Promise<string> {
    try {
        // Initialize provider with the Base blockchain RPC
        const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

        // Connect to the ERC-20 token contract
        const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            provider
        );

        // Fetch total supply
        const totalSupply = await tokenContract.totalSupply();

        // Convert BigNumber to a human-readable string
        return (totalSupply / BigInt(10n ** 18n)).toString();
    } catch (error) {
        elizaLogger.error(
            `[fetchTotalSupply] Error fetching total supply: ${error}`
        );
        throw new Error(
            `Failed to fetch total supply for token: ${tokenAddress}`
        );
    }
}
