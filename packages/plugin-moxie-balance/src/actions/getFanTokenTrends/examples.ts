import { ActionExample } from "@elizaos/core";

export const fanTokenTrendsExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me trends for nikolaiii's Creator Coin over the last 30 days",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `Here's the trend analysis for nikolaiii's Creator Coin:\n\nPrice Movement for nikolaiii:\n  • Starting Price: 1.15 MOXIE\n  • Current Price: 1.32 MOXIE (Current Market Price: 1.35 MOXIE)\n  • Percentage Change: +15.2%\n  • High/Low Range: 1.12 - 1.35 MOXIE\n\nVolume Analysis:\n  • Average Daily Volume: 2,345 MOXIE\n  • Volume Trend: Increasing over the period\n  • Peak Trading Volume Day: 5,678 MOXIE (15 days ago)\n  • Volume Change Percentage: +25.4%\n\nMarket Cap Metrics:\n  • Market Cap Change: +10,560 MOXIE\n  • Market Cap Growth Rate: 0.29% daily\n  • Current Market Cap: 132,000 MOXIE\n\nKey Insights:\n  • Overall Trend Direction: Strong upward momentum\n  • Notable Price Events: Broke key resistance at 1.30 MOXIE\n  • Volume Spikes: Three major spikes, highest 15 days ago\n  • Market Cap Milestones: Surpassed 130k MOXIE for first time`,
                action: "CREATOR_COIN_TRENDS",
            },
        },
    ],
];