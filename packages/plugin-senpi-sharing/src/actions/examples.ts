import { ActionExample } from "@senpi-ai/core";

export const sharingExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Share my Senpi NFT #1234 with @[user2|M456]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Successfully shared Senpi NFT #1234 with user2!

## Sharing Details
- NFT: Senpi #1234
- Shared with: user2
- Access Level: View & Display
- Duration: 30 days
- Status: Active

The recipient can now view and display this NFT in their collection.`,
                action: "SHARE_SUCCESS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Share NFT #5678 with @[user2|M456]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "You don't own Senpi NFT #5678. Please check the NFT ID and try again.",
                action: "SHARE_ERROR",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Share my Senpi NFT collection with @[user2|M456] and @[user3|M789]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Successfully shared your Senpi NFT collection!

## Sharing Summary
Shared 3 NFTs with user2 and user3:
- Senpi #1234
- Senpi #2345
- Senpi #3456

### Sharing Details
- Recipients: user2, user3
- Access Level: View & Display
- Duration: 30 days
- Status: Active

All recipients can now view and display these NFTs in their collections.`,
                action: "SHARE_MULTIPLE_SUCCESS",
            },
        },
    ],
];
