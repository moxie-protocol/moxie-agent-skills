import {
    WHALE_PURCHASE_CRITERIA_USD,
    CREATOR_COIN_BURN_CRITERIA_USD
} from '../config/dotenvConfig';


export const creatorCoinPrompt = (creatorCoins: any, ignoredCreatorCoinSymbols: string[], isANewTweet: boolean = true) => `
Analyze the provided JSON dataset to generate a series of captivating tweets (each under 280 characters) sharing market updates about ERC20 creator coins on Moxie. Follow these specific guidelines:

Analysis Criteria:
- Compare today's data with the previous day's data to identify trends.
- Focus exclusively on positive market cap changes above or close to 10%.
- Ignore negative changes or changes below the 10% threshold.
- Coin holders do not always have a direct correlation to the price or market cap.
- creatorCoinSymbolsConsidered should be an array of creator coin symbols mentioned in the tweets.
- You should not consider the creator coin for summary if it is in the ignoredCreatorCoinSymbols array.

Ignored Creator Coin Symbols:
${JSON.stringify(ignoredCreatorCoinSymbols)}

Tone & Style:
- You are a financial reporter writing headlines for CNBC or Bloomberg.
- Write in a style of stock market updates, focusing on the biggest positive movers.
- Frame updates creatively, highlighting growth and community.
- Focus on the facts and the big movements. Do not use excessive hyperbole.
- Do not use hashtags.

Content Requirements:
- If \`isANewTweet\` is \`true\`, the first tweet should always include the introduction: "📈 Here's the latest Creator Coins movers on Moxie!" Additionally, include the first piece of information in this tweet.
- If \`isANewTweet\` is \`false\`, the tweets should not include the introduction text.
- If a new thread is already indicated (via \`isANewTweet\`), you should include the introduction text for every first tweet of the newly generated thread.
- Include the percentage change in market cap as a primary highlight.
- Mention specific data points (e.g., market cap value, price per coin) to enrich the narrative, but ensure all numbers are precise.
- Output numbers with American commas. Always round numbers to 2 decimal places.
- Generate no tweets if there are no positive changes above or near the 10% threshold.
- Mention the creator Twitter handle if available; otherwise, mention the creator coin name.
- Add creatorCoinUrl to the tweet with the creator coin name.
- Market cap increase doesn't directly translate to price increase.
- Make sure to never start a tweeet with a @twitter-handle. Always start with a full stop then twitter-handle if it's the first element: ".@twitter-handle".

Example Tweets:
- First tweet of a new thread:📈 Here's the latest Creator Coins movers on Moxie! A notable surge for @twitter-handle with a market cap jump of 24.40% to $7,619.59. The coin’s price now sits at $0.09 USD, reflecting growing investor confidence. https://moxie.xyz/profile/symbol
- Additional tweets in the same thread (if applicable): .@twitter-handle saw an impressive 15.20% increase in market cap, reaching $5,348.12.  https://moxie.xyz/profile/symbol

Output Format:
- Output should only be in JSON format, structured as follows:
{
    "tweets": [
        "tweet1",
        "tweet2",
        "tweet3"
    ],
    "creatorCoinSymbolsConsidered": [
        "creatorCoinSymbol1",
        "creatorCoinSymbol2",
        "creatorCoinSymbol3"
    ]
}
- Ensure JSON is properly formatted.

isANewTweet: ${isANewTweet}

Data:
${JSON.stringify(creatorCoins)}
`;


export const creatorCoinBuyBurnPrompt = (creatorCoinBuyBurnDetails: any, duration: number, ignoredCreatorCoinSymbols: string[], isANewTweet: boolean = true) => `

Analyze the provided JSON dataset to generate a series of captivating tweets (each under 280 characters) sharing updates about ERC20 creator coin buy-and-burn activity on Moxie. Follow these specific guidelines:

Analysis Criteria:
- Aggregate buy-and-burn data for each creator coin to provide a clear and concise overview.
- Include key metrics such as the creator coin name, market cap, current price, quantity of coins burned, and USD amount spent for burning.
- The data provided is for the last ${duration} minutes.

Tone & Style:
- You are a financial reporter writing headlines for CNBC or Bloomberg.
- Write in a style of stock market updates, focusing on the biggest positive movers.
- Frame updates creatively, highlighting growth and community.
- Focus on the facts and the big movements. Do not use excessive hyperbole.
- Do not use hashtags.

Content Requirements:
- If \`isANewTweet\` is \`true\`, the first tweet should always include the introduction: "🔥 Here's the latest Creator Coins Burns on Moxie -- coins are burned when creators earn!". Additionally, include the first piece of information in this tweet.
- If \`isANewTweet\` is \`false\`, the tweets should not include the introduction text.
- Ensure each tweet is concise and engaging, focusing on one or two creator coins per tweet.
- Mention the creator Twitter handle if available; otherwise, mention the creator coin name.
- Add creatorCoinUrl to the tweet with the creator coin name.
- Output numbers with American commas. Always round numbers to 2 decimal places.
- If there are no significant (above $${CREATOR_COIN_BURN_CRITERIA_USD} USD in value burned in total) buy-and-burn activities, do not generate tweets.
- creatorCoinSymbolsConsidered should be an array of creator coin symbols mentioned in the tweets.
- Do not consider the creator coin for summary if it is in the ignoredCreatorCoinSymbols array.
- Make sure to never start a tweeet with a @twitter-handle. Always start with a full stop then twitter-handle if it's the first element: ".@twitter-handle".

Ignored Creator Coin Symbols:
${JSON.stringify(ignoredCreatorCoinSymbols)}

Example Tweets:
- First tweet of a new thread: 🔥 Here's the latest Creator Coins Burns on Moxie: Base Economy sees a burn of 56,686 ($60.58), increasing its price to $27.42 per coin, and market cap $251,309, signaling strong community engagement. Check it out: https://moxie.xyz/token/base_economy
- Additional tweets in the same thread (if applicable): Base Economy burned 45,000 tokens worth $55.67, bringing its market cap to $245,310. The community is thriving! https://moxie.xyz/token/base_economy

Output Format:
- Output should only be in JSON format, structured as follows:
{
    "tweets": [
        "tweet1",
        "tweet2",
        "tweet3"
    ],
    "creatorCoinSymbolsConsidered": [
        "creatorCoinSymbol1",
        "creatorCoinSymbol2",
        "creatorCoinSymbol3"
    ]
}
- Ensure JSON is properly formatted.

isANewTweet: ${isANewTweet}

Data:
${JSON.stringify(creatorCoinBuyBurnDetails)}
`;



export const creatorCoinWhaleBuySellPrompt = (creatorCoinWhaleBuySellDetails: any, duration: number, ) => `

Analyze the provided JSON dataset to generate a tweet (each under 280 characters) about big creator coin purchases. Follow these specific guidelines:

Analysis Criteria:
- Identify and highlight largest whale buys by USD value, $${WHALE_PURCHASE_CRITERIA_USD} minimum. Ignore SALES.
- The data provided is for the last ${duration} minutes.

Tone & Style:
- You are a financial reporter writing headlines for CNBC or Bloomberg.
- Write in a style of stock market updates, focusing on the biggest positive movers.
- Frame updates creatively, highlighting growth, and community.
- Focus on the facts and the big movements. Do not use excessive hyperbole.
- Do not use hashtags.

Content Requirements:
- The tweet should start with "🐳 whale alert:"
- If there are multiple whale purchases for the same creator coin, aggregate the data and mention the total amount bought and the total USD value.
- Incorporate key data points, such as:
  - Creator coin name.
  - Quantity bought
  - USD value of the transaction.
  - Market impact - what is the current price and market cap of the creator coin,
- Output numbers with American commas. Always round numbers to 2 decimal places.
- Mention the creator coin twitter handle ('creatorCoinTwitterHandle') if available, else mention creator coin name. But one of the two should be mentioned.
- Add creatorCoinUrl to the tweet with the creator coin name.
- If no significant whale activity or trends are identified, do not generate tweets.
- Mention the purchaser twitter handle ('twitterHandleOfPurchaser') if available.
- Do not mention about creatorCoinPriceInUSD.
- Consider the market cap of the creator coin with the hight blockTimestamp to be the current market cap.

Example Tweet:
🐳 whale alert: @betashop acquires 838.32 @afrochicksnft coins for $635.47, elevating its market cap to $4,421.68. https://moxie.xyz/profile/MOXIE_USER_ID

Output Format:
- Output should only be in JSON format, structured as follows:
{
    "tweets": [
        "tweet"
    ]
}
- Ensure JSON is properly formatted.

Data:
${JSON.stringify(creatorCoinWhaleBuySellDetails)}
`;