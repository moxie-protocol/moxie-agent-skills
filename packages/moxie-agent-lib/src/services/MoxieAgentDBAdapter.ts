import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { elizaLogger } from "@moxie-protocol/core";
import { IAgentRuntime } from "@moxie-protocol/core";
import { v4 as uuidv4 } from "uuid";
import { ethers } from "ethers";
import { MOXIE_USER_PORTFOLIOS_QUERY } from "./constants";
import { MoxiePortfolioInfo, MoxiePortfolioResponse, Skill } from "./types";

export class MoxieAgentDBAdapter extends PostgresDatabaseAdapter {
    private pgAdapter: PostgresDatabaseAdapter;
    constructor(connectionConfig: any) {
        super(connectionConfig);
        this.pgAdapter = new PostgresDatabaseAdapter(connectionConfig);
    }

    async getFreeTrailBalance(
        userId: string,
        pluginId: string
    ): Promise<{ user_id: string; plugin_id: string; total_free_queries: number; remaining_free_queries: number }> {
        return this.pgAdapter
            .query(
                `SELECT * FROM free_usage_details WHERE user_id = $1 AND plugin_id = $2`,
                [userId, pluginId]
            )
            .then((result) => {
                if (result.rows.length > 0) {
                    return {
                        user_id: userId,
                        plugin_id: pluginId,
                        total_free_queries: result.rows[0].total_free_queries,
                        remaining_free_queries: result.rows[0].remaining_free_queries
                    };
                } else {
                    const totalFreeQueries = 10;
                    const remainingFreeQueries = 10;
                    return this.pgAdapter
                        .query(
                            `INSERT INTO free_usage_details (id, user_id, plugin_id, total_free_queries, remaining_free_queries) VALUES ($1, $2, $3, $4, $5) RETURNING total_free_queries, remaining_free_queries`,
                            [
                                uuidv4(),
                                userId,
                                pluginId,
                                totalFreeQueries,
                                remainingFreeQueries,
                            ]
                        )
                        .then((insertResult) => ({
                            user_id: userId,
                            plugin_id: pluginId,
                            total_free_queries: insertResult.rows[0].total_free_queries,
                            remaining_free_queries: insertResult.rows[0].remaining_free_queries,
                        }));
                }
            });
    }

    async deductFreeTrail(userId: string, pluginId: string): Promise<{ user_id: string; plugin_id: string; total_free_queries: number; remaining_free_queries: number }> {
        return this.pgAdapter
            .query(
                `UPDATE free_usage_details SET remaining_free_queries = remaining_free_queries - 1 WHERE user_id = $1 AND plugin_id = $2 RETURNING total_free_queries, remaining_free_queries`,
                [userId, pluginId]
            )
            .then((result) => {
                if (result.rows.length > 0) {
                    return {
                        user_id: userId,
                        plugin_id: pluginId,
                        total_free_queries: result.rows[0].total_free_queries,
                        remaining_free_queries: result.rows[0].remaining_free_queries,
                    };
                } else {
                    return {
                        user_id: userId,
                        plugin_id: pluginId,
                        total_free_queries: 0,
                        remaining_free_queries: -1,
                    };
                }
            });
    }

    async createUserAgentFeedback(roomId: string, messageId: string, moxieUserId: string, agentId: string, feedback: string, rating: number, feedbackText: string, screenshotUrl: string): Promise<string> {
        return this.pgAdapter
            .query(
                `INSERT INTO user_agent_feedback (room_id, message_id, moxie_user_id, agent_id, feedback, rating, feedback_text, screenshot_url)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (message_id, moxie_user_id) DO UPDATE
                 SET feedback = $5,
                     feedback_text = $7,
                     rating = $6,
                     updated_at = CURRENT_TIMESTAMP
                 RETURNING id`,
                [roomId, messageId, moxieUserId, agentId, feedback, rating, feedbackText, screenshotUrl]
            )
            .then((result) => {
                return result.rows[0].id;
            })
            .catch((error) => {
                console.error(
                    "Error while creating user agent feedback:",
                    error
                );
                throw error;
            });
    }
    async getSkills(
        userId: string = "",
        installed_status: string = ""
    ): Promise<Skill[]> {
        const skillsTableName = process.env.SKILLS_TABLE_NAME || "skills";
        const userSkillsTableName = process.env.USER_SKILLS_TABLE_NAME || "user_skills";
        let selectFields = [
            "s.id",
            "s.name",
            "s.display_name",
            "s.version",
            "s.author",
            "s.description",
            "s.github_url",
            "s.logo_url",
            "s.settings",
            "s.capabilities",
            "s.starter_questions",
            "s.media_urls",
            "s.actions",
            "s.is_premium",
            "s.free_queries",
            "s.skill_coin_address",
            "s.minimum_skill_balance",
            "s.status",
            "s.is_default",
            "s.is_featured",
        ];
        if (userId !== "") {
            selectFields.push(`'${installed_status}' AS installed_status`);
        }
        let query = `SELECT ${selectFields.join(", ")} FROM ${skillsTableName} s `;
        if (userId !== "") {
            query += ` LEFT JOIN ${userSkillsTableName} us ON s.id = us.skill_id AND us.user_id = '${userId}'`;
        }
        if (installed_status !== "") {
            query += ` WHERE COALESCE(us.status, 'UNINSTALLED') = '${installed_status}'`;
            if (installed_status == "INSTALLED") {
                // default skills should be shown as installed even if they are not installed by the user
                query += ` OR s.is_default = true`;
            }
        }
        return this.pgAdapter.query(query, []).then((result) => {
            return result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                version: row.version,
                author: row.author,
                description: row.description,
                githubUrl: row.github_url,
                logoUrl: row.logo_url,
                status: row.status,
                isDefault: row.is_default,
                installedStatus: row.installed_status,
                settings: row.settings,
                capabilities: row.capabilities,
                starterQuestions: row.starter_questions,
                mediaUrls: row.media_urls,
                actions: row.actions,
                isPremium: row.is_premium,
                freeQueries: row.free_queries,
                skillCoinAddress: row.skill_coin_address,
                minimumSkillBalance: row.minimum_skill_balance,
                isFeatured: row.is_featured,
            }));
        });
    }

    async installSkill(
        userId: string,
        skillId: string,
        status: string
    ): Promise<void> {
        const userSkillsTableName = process.env.USER_SKILLS_TABLE_NAME || "user_skills";
        // This query inserts a new record into the user_skills table with a generated UUID, user_id, skill_id, status, and timestamps.
        // If a conflict occurs on user_id and skill_id (i.e., the user already has this skill), it updates the status and updated_at fields
        // only if the existing status is different from the new status.
        return this.pgAdapter
            .query(
                `
            INSERT INTO ${userSkillsTableName} (id, user_id, skill_id, status, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
            ON CONFLICT (user_id, skill_id)
            DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
            WHERE ${userSkillsTableName}.status <> EXCLUDED.status;`,
                [userId, skillId, status]
            )
            .then((result) => {
                if (result.rowCount === 0) {
                    throw new Error(`User ${userId} already set this status ${status} for skill ${skillId}`);
                }
                return null;
            })
            .catch((error) => {
                console.error("Error while installing skill:", error);
                throw error;
            });
    }

    async getLimitOrderDetails(orderId: string): Promise<{ wallet_address: string, order_id: string, status: string}> {
        return this.pgAdapter
            .query(`SELECT wallet_address, order_id, status FROM limit_orders WHERE order_id = $1`, [orderId])
            .then((result) => {
                if (result.rows.length > 0) {
                    return result.rows[0];
                } else {
                    return null;
                }
            });
    }

    async updateLimitOrder(orderId: string, status: string): Promise<number> {
        return this.pgAdapter
            .query(`UPDATE limit_orders SET status = $1, updated_at = now() WHERE order_id = $2`, [status, orderId])
            .then((result) => {
                return result.rowCount || 0 ;
            }).catch((error) => {
                console.error("Error while updating limit order:", error);
                throw error;
            });
    }

    async saveLimitOrder(orderId: string, walletAddress: string): Promise<string> {
        return this.pgAdapter
            .query(
                `INSERT INTO limit_orders (id, wallet_address, order_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
                [uuidv4(), walletAddress, orderId, 'open', new Date(), new Date()]
            )
            .then((result) => {
                return "success";
            })
            .catch((error) => {
                console.error("Error while saving limit order:", error);
                throw error;
            });
    }

    /**
     * Validates the balance of a creator coin token for a given wallet address
     * @param moxieUserId - The Moxie user ID
     * @param runtime - The runtime object. If provided, the function will cache the result in the runtime cache. If not provided, the function will not cache the result.
     * @param creatorCoinTokenAddress - The address of the creator coin token
     * @param requiredBalance - The required balance of the creator coin token
     */

    async validateCreatorCoinTokenBalance({
        moxieUserId,
        runtime,
        creatorCoinTokenAddress,
        requiredBalance,
    }: {
        moxieUserId: string;
        runtime?: IAgentRuntime;
        creatorCoinTokenAddress: string;
        requiredBalance: number;
    }): Promise<{
        creatorCoinTokenBalance: number;
        hasSufficientBalance: boolean;
    }> {
        elizaLogger.debug(
            `[validateCreatorCoinTokenBalance] [${moxieUserId}] Validating creator coin token balance`
        );

        const response = {
            creatorCoinTokenBalance: 0,
            hasSufficientBalance: false,
        };
        // bypass this check for internal dev team
        const devTeamMoxieUserIds =
            process.env.DEV_TEAM_MOXIE_USER_IDS?.split(",") || [];
        if (devTeamMoxieUserIds.includes(moxieUserId)) {
            return {
                creatorCoinTokenBalance: 0,
                hasSufficientBalance: true,
            };
        }
        const cacheKey = `creator-coin-token-balance-${moxieUserId}-${creatorCoinTokenAddress}`;

        // Check cache first if runtime provided
        if (runtime) {
            const cachedData = await runtime.cacheManager.get(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData as string);
            }
        }

        try {
            // Get portfolio info
            const portfolioInfo =
                await getMoxiePortfolioInfoByCreatorTokenDetails(moxieUserId, {
                    address: creatorCoinTokenAddress,
                });

            // Throw error if no portfolio found
            if (!portfolioInfo?.length) {
                const errorMessage = `No portfolio info found for moxie user ${moxieUserId}`;
                elizaLogger.error(errorMessage);
                return response;
            }

            const totalLockedAmount = portfolioInfo[0].totalLockedAmount;
            const totalUnlockedAmount = portfolioInfo[0].totalUnlockedAmount;
            const totalAmount = totalLockedAmount + totalUnlockedAmount;

            elizaLogger.debug(
                `[validateCreatorCoinTokenBalance] [${moxieUserId}] Total amount: ${totalAmount}`
            );

            response.creatorCoinTokenBalance = totalAmount;
            response.hasSufficientBalance = totalAmount >= requiredBalance;

            if (!response.hasSufficientBalance) {
                elizaLogger.error(
                    `[validateCreatorCoinTokenBalance] [${moxieUserId}] Total amount is less than required balance`
                );
            }

            // Cache result if runtime provided
            if (runtime) {
                await runtime.cacheManager.set(
                    cacheKey,
                    JSON.stringify(response),
                    {
                        expires: Date.now() + 60000, // 1 minute
                    }
                );
            }

            return response;
        } catch (error) {
            elizaLogger.error(
                "Error validating creator coin token balance:",
                error
            );
            throw error;
        }
    }
}

/**
 * Get the portfolio info for a creator token
 * @param moxieUserId - The moxie user id
 * @param creatorToken - The creator token details
 * @returns The portfolio info for the creator token or undefined if no portfolio info is found
 */
export async function getMoxiePortfolioInfoByCreatorTokenDetails(
    moxieUserId: string,
    creatorToken: {
        address?: string;
        name?: string;
        symbol?: string;
    }
): Promise<MoxiePortfolioInfo[] | undefined> {
    try {
        elizaLogger.debug(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] Getting portfolio info for user ${moxieUserId} and creator token ${JSON.stringify(creatorToken)}`
        );

        // Validate that at least one token detail is provided
        if (
            !creatorToken.address &&
            !creatorToken.name &&
            !creatorToken.symbol
        ) {
            throw new Error("At least one of the creator token details (address, name, or symbol) is required");
        }

        // Validate token details if provided
        if (creatorToken.address && !ethers.isAddress(creatorToken.address)) {
            throw new Error("Invalid token address");
        }

        if (creatorToken.name && creatorToken.name.length === 0) {
            throw new Error("Invalid token name");
        }

        if (creatorToken.symbol && creatorToken.symbol.length === 0) {
            throw new Error("Invalid token symbol");
        }

        // Build filter conditions
        const filterConditions = [
            `moxieUserId: {_eq: "${moxieUserId}"}`,
            ...(creatorToken.address
                ? [`fanTokenAddress: {_eq: "${creatorToken.address}"}`]
                : []),
            ...(creatorToken.name
                ? [`fanTokenName: {_eq: "${creatorToken.name}"}`]
                : []),
            ...(creatorToken.symbol
                ? [`fanTokenSymbol: {_eq: "${creatorToken.symbol}"}`]
                : []),
        ];

        elizaLogger.debug(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] Filter conditions: ${filterConditions.join(", ")}`
        );

        const query = MOXIE_USER_PORTFOLIOS_QUERY(filterConditions);

        let attempts = 0;
        const maxAttempts = 3;
        const backoffMs = 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(
                    process.env.AIRSTACK_GRAPHQL_ENDPOINT,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            query,
                            operationName: "GetPortfolioInfo",
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result =
                    (await response.json()) as MoxiePortfolioResponse;

                if (result.errors) {
                    elizaLogger.error(
                        `Error fetching portfolio info for user ${moxieUserId}:`,
                        result.errors
                    );
                    throw new Error(
                        `Error fetching portfolio info for user ${moxieUserId}: ${result.errors[0].message}`
                    );
                }

                if (!result.data?.MoxieUserPortfolios?.MoxieUserPortfolio) {
                    elizaLogger.error(
                        `No portfolio data found for user ${moxieUserId}`
                    );
                    return undefined;
                }

                const portfolioInfo =
                    result.data.MoxieUserPortfolios.MoxieUserPortfolio;
                elizaLogger.debug(
                    `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] Portfolio response: ${JSON.stringify(portfolioInfo)}`
                );
                return portfolioInfo;
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    elizaLogger.error(
                        `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] Failed after ${maxAttempts} attempts:`,
                        error
                    );
                    throw error;
                }
                elizaLogger.warn(
                    `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffMs * attempts)
                );
            }
        }
    } catch (error) {
        elizaLogger.error(
            `[getMoxiePortfolioInfoByCreatorTokenDetails] [${moxieUserId}] Error fetching portfolio info:`,
            error
        );
        throw error;
    }
}
