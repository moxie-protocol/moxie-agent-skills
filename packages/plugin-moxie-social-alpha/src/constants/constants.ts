import { Cast } from "../services/farcasterService";

export const mockCastsByFid: Cast[] = [
    {
        hash: "0x123",
        author: {
            fid: 123,
            username: "test",
            displayName: "Test User",
        },
        text: "This is a test cast",
        timeParsed: new Date(),
        replyCount: 0,
        likesCount: 0,
        recastsCount: 0,
    },
    {
        hash: "0x456",
        author: {
            fid: 123,
            username: "test",
            displayName: "Test User",
        },
        text: "This is another test cast",
        timeParsed: new Date(),
        replyCount: 0,
        likesCount: 0,
        recastsCount: 0,
    },
    {
        hash: "0x789",
        author: {
            fid: 123,
            username: "test",
            displayName: "Test User",
        },
        text: "This is a test cast",
        timeParsed: new Date(),
        replyCount: 0,
        likesCount: 0,
        recastsCount: 0,
    },
];
