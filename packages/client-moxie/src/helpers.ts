import { ethers } from "ethers";

/**
 * Fetches user details from the Moxie API
 * @param bearerToken - Authentication token for the Moxie API
 * @returns Promise containing the MoxieUser details
 * @throws Error if the API request fails
 */

import { ValidationError } from "./types/types";
import {
    CREATOR_AGENT_TOKEN_ADDRESS,
    MINIMUM_CREATOR_AGENT_COINS,
    BASE_RPC_URL,
} from "./constants/constants";
import { elizaLogger, validateUuid, IAgentRuntime } from "@moxie-protocol/core";
import {
    MoxieWallet,
    getMoxiePortfolioInfoByCreatorTokenDetails,
} from "@moxie-protocol/moxie-agent-lib";

/**
 * Fetches the balance of fan tokens for a given wallet address
 * @param tokenAddress - The token address
 * @param walletAddress - The wallet address to check the balance for
 * @returns Promise containing the token balance as a string
 * @throws Error if the contract call fails or returns invalid response
 */
export async function getERC20TokenBalance(
    tokenAddress: string,
    walletAddress: string
) {
    const abi = [
        {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
        },
    ];

    try {
        // Using Base mainnet RPC URL
        const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
        const contract = new ethers.Contract(tokenAddress, abi, provider);
        const balanceWEI = await contract.balanceOf(walletAddress);
        return ethers.formatEther(balanceWEI.toString());
    } catch (error) {
        elizaLogger.error("Error fetching token balance:", error);
        throw error;
    }
}

/**
 * Validates the balance of Moxie AI Agent tokens for a given wallet address
 * @param moxieUserId - The Moxie user ID
 * @param runtime - The runtime object. If provided, the function will cache the result in the runtime cache. If not provided, the function will not cache the result.
 * @returns Promise containing the creator agent balance and a boolean value indicating if the balance is sufficient
 * @throws Error if the contract call fails or returns invalid response
 */
export async function validateMoxieAIAgentBalance({
    moxieUserId,
    runtime,
}: {
    moxieUserId: string;
    runtime?: IAgentRuntime;
}): Promise<{
    creatorAgentBalance: number;
    hasSufficientBalance: boolean;
}> {
    elizaLogger.debug(
        `[validateMoxieAIAgentBalance] [${moxieUserId}] Validating Moxie AI Agent balance`
    );

    const response = {
        creatorAgentBalance: 0,
        hasSufficientBalance: false,
    };

    // bypass this check for internal dev team
    const devTeamMoxieUserIds =
        process.env.DEV_TEAM_MOXIE_USER_IDS?.split(",") || [];
    if (devTeamMoxieUserIds.includes(moxieUserId)) {
        return {
            creatorAgentBalance: 0,
            hasSufficientBalance: true,
        };
    }

    const cacheKey = `moxie-ai-creator-coin-balance-${moxieUserId}`;

    // Check cache first if runtime provided
    if (runtime) {
        const cachedData = await runtime.cacheManager.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData as string);
        }
    }

    // Get portfolio info
    const portfolioInfo = await getMoxiePortfolioInfoByCreatorTokenDetails(
        moxieUserId,
        {
            address: CREATOR_AGENT_TOKEN_ADDRESS,
        }
    );

    // Return early if no portfolio found
    if (!portfolioInfo?.length) {
        elizaLogger.error(
            `No portfolio info found for moxie user ${moxieUserId}`
        );
        return response;
    }

    const totalLockedAmount = portfolioInfo[0].totalLockedAmount;
    const totalUnlockedAmount = portfolioInfo[0].totalUnlockedAmount;
    const totalAmount = totalLockedAmount + totalUnlockedAmount;

    elizaLogger.debug(
        `[validateMoxieAIAgentBalance] [${moxieUserId}] Total amount: ${totalAmount}`
    );

    response.creatorAgentBalance = totalAmount;
    response.hasSufficientBalance = totalAmount >= MINIMUM_CREATOR_AGENT_COINS;

    if (!response.hasSufficientBalance) {
        elizaLogger.error(
            `[validateMoxieAIAgentBalance] [${moxieUserId}] Total amount is less than minimum creator agent coins`
        );
    }

    // Cache result if runtime provided
    if (runtime) {
        await runtime.cacheManager.set(cacheKey, JSON.stringify(response), {
            expires: Date.now() + 60000, // 1 minute
        });
    }

    return response;
}

export async function validateCreatorAgentCoinBalance(
    wallets: MoxieWallet[]
): Promise<{ creatorAgentBalance: number; hasSufficientBalance: boolean }> {
    // validate if the user holds xx amount of creator agent coins
    let creatorAgentCoinsBalance: number = 0;
    for (const wallet of wallets) {
        try {
            const balance = await getERC20TokenBalance(
                CREATOR_AGENT_TOKEN_ADDRESS,
                wallet.walletAddress
            );
            creatorAgentCoinsBalance += Number(balance);
        } catch (error) {
            elizaLogger.error(
                `Error checking token balance for wallet ${wallet.walletAddress}:`,
                error
            );
        }
    }
    if (creatorAgentCoinsBalance < MINIMUM_CREATOR_AGENT_COINS) {
        return {
            creatorAgentBalance: creatorAgentCoinsBalance,
            hasSufficientBalance: false,
        };
    }
    return {
        creatorAgentBalance: creatorAgentCoinsBalance,
        hasSufficientBalance: true,
    };
}

export function validateInputAgentInteractions(query: {
    currentRoomId?: string;
    limit?: string;
    offset?: string;
}): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!query.currentRoomId || !validateUuid(query.currentRoomId)) {
        errors.push({
            field: "currentRoomId",
            message: "Invalid or missing roomId",
        });
    }

    if (!query.limit) {
        errors.push({ field: "limit", message: "Missing limit parameter" });
    } else if (isNaN(Number(query.limit))) {
        errors.push({
            field: "limit",
            message: "Limit must be a valid number",
        });
    }

    return errors;
}
