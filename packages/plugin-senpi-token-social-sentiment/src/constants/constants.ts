import { CastData } from "../services/neynarService";

export const mockFarcasterCasts:CastData[] = [
    {
        text: "This is a test cast",
        username: "test",
        fid: 123,
        likes_count: 0,
        recasts_count: 0,
        replies_count: 0,
        timestamp: new Date().toISOString(),
        cast_url: "https://warpcast.com/test/0x123",
        totalInteractions: 0,
    },
    {
        text: "This is another test cast",
        username: "test2",
        fid: 456,
        likes_count: 0,
        recasts_count: 0,
        replies_count: 0,
        timestamp: new Date().toISOString(),
        cast_url: "https://warpcast.com/test2/0x456",
        totalInteractions: 0,
    },

]