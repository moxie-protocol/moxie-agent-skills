import { ActionExample } from "@senpi-ai/core";

export const tokenSwapExamples: ActionExample[][] = [
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
                action: "SWAP_TOKENS",
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
                action: "SWAP_TOKENS",
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
                action: "SWAP_TOKENS",
            },
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
                action: "SWAP_TOKENS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "buy me 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to buy 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
                action: "SWAP_TOKENS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "buy me 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]] and 1 $[MOXIE|0x8C9037D1Ef5c6D1f6816278C7AAF5491d24CD527]]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to buy 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]] and 1 $[MOXIE|0x8C9037D1Ef5c6D1f6816278C7AAF5491d24CD527]]",
                action: "SWAP_TOKENS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "swap 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to swap 1 $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
                action: "SWAP_TOKENS",
            },
        },
    ],

    [
        {
            user: "{{user1}}",
            content: {
                text: "sell all my $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Sure, I'll help you to sell all your $[DEGEN|0x4ed4e862860bed51a9570b96d89af5e1b0efefed]]",
                action: "SWAP_TOKENS",
            },
        },
    ],
];
