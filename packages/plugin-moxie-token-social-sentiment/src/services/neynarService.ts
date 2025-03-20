interface CastResponse {
    result: {
        casts: Cast[];
    };
}

interface Cast {
    text: string;
    hash: string;
    username: string;
    fid: number;
    reactions: {
        likes_count: number;
        recasts_count: number;
    };
    replies: {
        count: number;
    };
    timestamp: string;
    author: {
        username: string;
        fid: number;
        display_name: string;
        pfp_url: string;
    };
    thread_hash: string;
    parent_hash: string;
    parent_url: string;
    root_parent_url: string;
    parent_author: {
        fid: number;
    };
}

interface CastData {
    text: string;
    username: string;
    fid: number;
    likes_count: number;
    recasts_count: number;
    replies_count: number;
    timestamp: string;
    cast_url: string;
    totalInteractions: number;
}

import { elizaLogger, IAgentRuntime } from "@moxie-protocol/core";
import axios from "axios";

const API_KEY = process.env.NEYNAR_API_KEY;
if (!API_KEY) {
    throw new Error("NEYNAR_API_KEY environment variable is required");
}

const client = axios.create({
    baseURL: process.env.NEYNAR_API_URL,
    headers: {
        "x-api-key": `${API_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
        "x-neynar-experimental": "false",
    },
});

export async function getFarcasterCasts(query: string, runtime: IAgentRuntime) {
    try {
        elizaLogger.log(
            `[Farcaster] Getting Farcaster casts for query: ${query}`
        );
        elizaLogger.log(
            `[Farcaster] api key and url: ${API_KEY} and ${process.env.NEYNAR_API_URL}`
        );

        let attempts = 0;
        const maxAttempts = 3;
        const backoffMs = 1000;
        while (attempts < maxAttempts) {
            try {
                // use current time and get one day ago
                // prepare the query like blockchain after:2023-06-01
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const formattedDate = oneDayAgo.toISOString().split("T")[0];
                query = `$${query} after:${formattedDate} `;
                elizaLogger.log(`[Farcaster] query: ${query}`);
                const response = await client.get(
                    `/v2/farcaster/cast/search?q=${query}&priority_mode=false&limit=100&sort_type=algorithmic`
                );
                elizaLogger.log("Farcaster casts response: ", response.data);

                const castResponse = response.data as CastResponse;
                let castData: CastData[] = [];
                castResponse.result.casts.forEach((cast) => {
                    //choose first 10 chars of hash
                    let castUrl = "https://warpcast.com/" + cast.author.username + "/" + cast.hash.substring(0, 10);
                    castData.push({
                        text: cast.text,
                        username: cast.author.username,
                        fid: cast.author.fid,
                        likes_count: cast.reactions.likes_count,
                        recasts_count: cast.reactions.recasts_count,
                        replies_count: cast.replies.count,
                        timestamp: cast.timestamp,
                        cast_url: castUrl,
                        totalInteractions:
                            cast.reactions.likes_count +
                            cast.reactions.recasts_count +
                            cast.replies.count,
                    });
                });

                const sortedCastData = sortCastsByEngagement(castData);

                return sortedCastData;
            } catch (error) {
                attempts++;
                if (attempts === maxAttempts) {
                    throw error;
                }
                elizaLogger.warn(
                    `Neynar API call failed, attempt ${attempts}/${maxAttempts}. Retrying...`
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffMs * attempts)
                );
            }
        }
    } catch (error) {
        elizaLogger.error(
            "Failed to fetch Farcaster casts after multiple attempts: ",
            error
        );
        throw error;
    }
}

function sortCastsByEngagement(casts: CastData[]) {
    return casts.sort((a, b) => b.totalInteractions - a.totalInteractions);
}
