import { UUID } from "@moxie-protocol/core";

export interface PostContent {
    text: string;
    platform?: string;
    timestamp: string;
    userId: UUID;
}

export interface PostResponse {
    success: boolean;
    postId?: string;
    error?: string;
} 