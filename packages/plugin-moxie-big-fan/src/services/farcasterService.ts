import { elizaLogger } from "@elizaos/core";
import { CastAddMessage, fromFarcasterTime } from "@farcaster/hub-nodejs";
import axios from "axios";

export interface Cast {
    hash: string;
    author: {
        fid: number;
        username: string;
        displayName: string;
    };
    text: string;
    timeParsed: Date;
    replyCount: number;
    likesCount: number;
    recastsCount: number;
}
interface NeynarCast {
    object: string;
    hash: string;
    author: {
        object: string;
        fid: number;
        username: string;
        display_name: string;
        pfp_url: string;
        custody_address: string;
        profile: {
            bio: {
                text: string;
            };
            location?: {
                latitude: number;
                longitude: number;
                address: {
                    city: string;
                    state: string;
                    state_code: string;
                    country: string;
                    country_code: string;
                };
            };
        };
        follower_count: number;
        following_count: number;
        verifications: string[];
        verified_addresses: {
            eth_addresses: string[];
            sol_addresses: string[];
        };
        verified_accounts: {
            platform: string;
            username: string;
        }[];
        power_badge: boolean;
    };
    thread_hash: string;
    parent_hash: string | null;
    parent_url: string | null;
    root_parent_url: string | null;
    parent_author: {
        fid: number | null;
    };
    text: string;
    timestamp: string;
    embeds: {
        url: string;
        metadata: {
            content_type: string;
            content_length: number;
            _status: string;
            image?: {
                width_px: number;
                height_px: number;
            };
        };
    }[];
    channel: string | null;
    reactions: {
        likes_count: number;
        recasts_count: number;
        likes: {
            fid: number;
            fname: string;
        }[];
        recasts: any[];
    };
    replies: {
        count: number;
    };
    mentioned_profiles: {
        object: string;
        fid: number;
        custody_address: string;
        username: string;
        display_name: string;
        pfp_url: string;
        profile: {
            bio: {
                text: string;
                mentioned_profiles: any[];
            };
        };
        follower_count: number;
        following_count: number;
        verifications: string[];
        verified_addresses: {
            eth_addresses: string[];
            sol_addresses: string[];
        };
        power_badge: boolean;
    }[];
}

interface NeynarCastResponse {
    casts: NeynarCast[];
    next?: {
        cursor: string;
    };
}

export const fetchCastByFid = async (
    fid: string,
    maxCasts: number = 20,
    includeReplies: boolean = false
): Promise<Cast[]> => {
    const startTime = Date.now();
    try {
        const response = await axios.get<NeynarCastResponse>(
            `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=${maxCasts}&include_replies=${includeReplies}`,
            {
                headers: {
                    accept: "application/json",
                    "x-api-key": process.env.NEYNAR_API_KEY || "",
                },
            }
        );

        const parsedMessages:Cast[] = response.data.casts.map((cast) => ({
            hash: cast.hash,
            threadHash: cast.thread_hash,
            parentHash: cast.parent_hash,
            author: {
                fid: cast.author.fid,
                username: cast.author.username,
                displayName: cast.author.display_name,
            },
            text: cast.text,
            timeParsed: new Date(cast.timestamp),
            replyCount: cast.replies.count,
            likesCount: cast.reactions.likes_count,
            recastsCount: cast.reactions.recasts_count,
        }));

        const endTime = Date.now();
        elizaLogger.debug(
            `Time taken to fetch ${parsedMessages.length} casts for fid ${fid}: ${endTime - startTime}ms`
        );
        return parsedMessages;
    } catch (e) {
        elizaLogger.error(`Error fetching casts for ${fid} ${e}`);
        throw e;
    }
};