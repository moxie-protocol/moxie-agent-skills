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
        timestamp: 1717334400,
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
        timestamp: 1717334400,
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
        timestamp: 1717334400,
        timeParsed: new Date(),
        replyCount: 0,
        likesCount: 0,
        recastsCount: 0,
    },
];


export const DATA_FILTER_DURATION_IN_HOURS = process.env.DATA_FILTER_DURATION_IN_HOURS ? Number(process.env.DATA_FILTER_DURATION_IN_HOURS) : 48;