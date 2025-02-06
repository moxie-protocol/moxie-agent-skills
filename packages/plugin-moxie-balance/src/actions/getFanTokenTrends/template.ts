export const fanTokenTrendsTemplate = `
Analyze trends for a specific Creator Coin from {{message}} over a time period asked in {{message}} from {{subjectTokenDailySnapshots}}.

- Price Movement for
  • Starting Price
  • Current Price
  • Percentage Change:
  • High/Low Range

- Volume Analysis:
  • Average Daily Volume
  • Volume Trend (increasing/decreasing)
  • Peak Trading Volume Day
  • Volume Change Percentage

- Market Cap Metrics:
  • Market Cap Change
  • Market Cap Growth Rate
  • Current Market Cap

- Key Insights:
  • Overall Trend Direction
  • Notable Price Events
  • Volume Spikes
  • Market Cap Milestones

Use name from subjectToken.name
Also add currentPriceInMoxie from subjectToken.currentPriceInMoxie as Current Market Price

Format the analysis in a clear, readable way using sections and bullet points.
Use 2 decimal places for numerical values.
Highlight significant changes or trends.
Value are in Moxie

`