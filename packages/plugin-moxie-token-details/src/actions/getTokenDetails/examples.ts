import { ActionExample } from "@moxie-protocol/core";

export const tokenDetailsExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the token details for 0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `### Token Overview
- **Token Name**: Moxie ($MOXIE)
- **Token Address**: 0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527
- **Network ID**: 8453
- **Current Price**: $0.0023
- **Market Cap**: $23,223,583
- **Liquidity**: $113,334
- **Unique Holders**: 109,622

### Technical Analysis
- **1H Change**: +2.83%
- **4H Change**: -3.17%
- **12H Change**: -7.83%
- **24H Change**: -15.71%
- **Hourly RSI**: Neutral momentum at 46.02
- **Bullish Patterns**: Strong double bottom on 4H and 12H charts
- **Bearish Patterns**: Double top seen in 5-minute & 1-minute charts

### Market Activity
- **24H Trading Volume**: 168,664.29
- **Major Trading Pairs**: MOXIE/VIRTUAL, MOXIE/ETH
- **Liquidity Concentration**: High liquidity primarily in MOXIE/VIRTUAL pair

### Market Sentiment
- **Overall Sentiment**: Neutral
- **Regulatory News Impact**: ETF approvals provide positive sentiment

### Social Media Insights
- **Recent Trends**: Increased mentions of upcoming market movement in February
- **Upcoming Market Events**: Expected platform upgrades & announcements

### Key Considerations
- **Current price action shows** mixed signals across different timeframes.
- **Institutional interest** and ETF developments are supportive.
- **Volatility concerns** in CEXs and regulatory uncertainties persist.
- **Investment Advice**: Consider market volatility and technical indicators before making a decision.`,
                action: "TOKEN_MARKET_PERFORMANCE",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Should I invest in MOXIE (0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527)?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `### Investment Considerations for MOXIE
- **Current Price**: $0.0023
- **Market Cap**: $23,223,583
- **Liquidity**: $113,334
- **Recent Trend**: **Bearish** over 24 hours (-15.71%) but **bullish** over 1 hour (+2.83%).
- **Technical Indicators**:
  - **Hourly RSI**: Neutral (46.02) – no clear overbought or oversold signals.
  - **Bullish Signs**: Double bottom formations on 4-hour and 12-hour charts.
  - **Bearish Risks**: Short-term double top formations on 5-minute and 1-minute charts.
- **Market Sentiment**: Neutral, with ETF approvals bringing some positivity.
- **Social Media Buzz**: Increased mentions of Moxie in trading communities.
- **Risks**:
  - **High volatility** in the last 24 hours.
  - **Potential liquidity risks** for large trades.
  - **Regulatory uncertainty** around memecoins and emerging tokens.

### **Final Thoughts**
MOXIE shows **mixed signals**, with **short-term bullish patterns** but **long-term bearish trends**. Consider **diversifying** investments and **conducting further research** before making a decision.

🚀 **Not Financial Advice – Always DYOR (Do Your Own Research)!**`,
                action: "TOKEN_DETAILS",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What is the current price of MOXIE (0x8c9037d1ef5c6d1f6816278c7aaf5491d24cd527)?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `The current price of MOXIE is $0.0023`,
                action: "TOKEN_PRICE",
            },
        },
        {
            user: "{{user1}}",
            content: {
                text: "What is the market cap?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `The market cap of MOXIE is $23,223,583`,
                action: "TOKEN_MARKET_CAP",
            },
        },
        {
            user: "{{user1}}",
            content: {
                text: "What is the liquidity?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `The liquidity of MOXIE is $113,334`,
                action: "TOKEN_LIQUIDITY",
            },
        },
        {
            user: "{{user1}}",
            content: {
                text: "What is the unique holders?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `The unique holders of MOXIE are 109,622`,
                action: "TOKEN_HOLDERS",
            },
        },
        {
            user: "{{user1}}",
            content: {
                text: "What is the market performance or market sentiment about it?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Overall Sentiment: Neutral to Bearish. There is strong short-term buying (1-4H), but significant selling pressure in longer timeframes. Trading patterns indicate higher buy counts compared to sells, but the price is still declining, suggesting larger sell orders.\n\nKey Considerations:\n- **Strength:** Active trading with a high holder count (109K+)\n- **Concerns:** Significant price decline (-15.86%) in the last 24 hours, coupled with limited liquidity ($114K) relative to market cap.\n- **Risk Level:** High, with significant price volatility.\n\n**Investment Advice:** Exercise caution due to high volatility and limited liquidity. If investing, consider small position sizes.",
                action: "TOKEN_MARKET_PERFORMANCE",
            },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Give me the token details for Trump coin (6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN) on Solana",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: `I'm sorry, but I can't provide token details for TRUMP on Solana. I only support tokens on Base.`,
            },
        },
    ],
];
