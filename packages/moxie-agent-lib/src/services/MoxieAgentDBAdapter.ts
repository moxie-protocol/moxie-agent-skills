import { PostgresDatabaseAdapter } from "@elizaos/adapter-postgres";
import { v4 as uuidv4 } from "uuid";

export class MoxieAgentDBAdapter extends PostgresDatabaseAdapter {
    private pgAdapter: InstanceType<typeof PostgresDatabaseAdapter>;
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
                    }
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
                console.error("Error while creating user agent feedback:", error);
                throw error;
            });
    }
}
