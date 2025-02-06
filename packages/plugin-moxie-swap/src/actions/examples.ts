import { ActionExample } from "@elizaos/core";

export const creatorCoinSwapExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Buy me 10 @[betashop|M5]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to buy 10 @[betashop|M5]",
                action: "SWAP_CREATOR_COINS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Swap $10 worth of @[betashop|M5] creator coins",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to swap $10 worth of @[betashop|M5] creator coins",
                action: "SWAP_CREATOR_COINS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "purchase me $10 $eth worth of @[ac|M1] and @[bc|M2]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Would you like to buy $5 worth of ETH each for @[ac|M1] and @[bc|M2]?",
                action: "SWAP_CREATOR_COINS",
            }
        },
        {
            user: "{{user1}}",
            content: {
                text: "Yes, please",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to purchase $5 worth of ETH each for @[ac|M1] and @[bc|M2]",
                action: "SWAP_CREATOR_COINS",
            },
        },
    ],
];
