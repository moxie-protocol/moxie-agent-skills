import { generateText, ModelClass, parseJSONObjectFromText, elizaLogger } from "@elizaos/core";
import { getMoxieIdsFromMessage } from "./actions/utils";

export const tweetSummary = `

Current Date: {{currentDate}}

Try to answer below query:
 User Message: {{message}}

 Recent messages:
{{recentMessages}}

If the question is about summarizing recent Twitter activity use below instructions:
   Provide a concise but informative summary of the tweets
    - Focus on the most engaging or important content
    - Consider timestamp, recent tweets are more important
    - If its a retweet, use content of retweet for summary
    - Give more weightage to crypto & blockchain related posts
    - Give summary of each user separately
    - Only summarize the post based on timeframe mentioned in the message

    Tweets JSON data:
   {{tweets}}
`;

export const castsSummary = `
Current Date: {{currentDate}}

Try to answer below query:
 User Message: {{message}}

 Recent messages:
{{recentMessages}}

If the question is about summarizing recent post also known as casts done on farcaster web3 social media
   Provide a concise but informative summary of the casts/posts
    - Focus on the most engaging or important content
    - Consider timestamp, recent casts are more important
    - Give more weightage to crypto & blockchain related posts
    - Give summary of each user separately
    - Only summarize the post based on timeframe mentioned in the message
   {{tweets}}
`;

export const swapSummary = `

Current Date: {{currentDate}}

Try to answer below query:
 User Message: {{message}}

 Recent messages:
{{recentMessages}}

If the question is about summarizing  recent Token purchase activity done by users I follow
   Provide a concise but informative summary of the tweets
    - Focus more on token with high volume
    - More users are buying more tokens is more important
    - Try to give summary of each token based on who else is buying it
   {{swaps}}
`;

export const socialSummary = `

Current Date: {{currentDate}}

Try to answer below query:
 User Message: {{message}}

 Recent messages:
{{recentMessages}}

If the question is about summarizing recent social media activity done by users I follow
   Provide a concise but informative summary of the social media activity
    - Focus more on social media with high volume
    - More users are posting more tokens is more important
    - Try to give summary of each social media based on who else is posting it
    - Only summarize the post based on timeframe mentioned in the message

    Twitter Posts:
    {{twitterPosts}}

    Farcaster Posts:
    {{farcasterPosts}}
`;


export const currentUserContext = `
Given the following conversation, determine which moxie ids are relevant to the user.

Conversation history:
{{recentMessages}}

Current Message:
{{message}}

moxie ids in context are {{moxieIds}}
Top creators moxie Ids are {{topCreatorMoxieIds}}

Your task is to return ONLY a valid JSON array of Moxie IDs based on these rules:

1. If the message directly mentions or asks about specific Moxie IDs that are in context ({{moxieIds}}), return those specific IDs
2. If the message is a general query not mentioning specific Moxie IDs (like the examples below), return the top creators' Moxie IDs ({{topCreatorMoxieIds}})

For example:
- Message "What is M4 buying?" -> ["M4"]
- Message "What are my creators buying?" -> [return topCreatorMoxieIds]

{{examples}}

IMPORTANT: Your response must be ONLY a valid JSON array of strings containing Moxie IDs, nothing else.
Example valid responses:
["M4"]
["M1", "M2", "M3"]
`;

export const topCreatorsTwitterExamples = `
Example 1: What is the twitter activity of my creators?
Example 2: What is the hot on twitter?
Example 3: What is new on twitter?
Example 4: What are my friends upto on twitter?
`;

export const topCreatorsFarcasterExamples = `
Example 1: What is the farcaster activity of my creators?
Example 2: What is the hot on farcaster?
Example 3: What is new on farcaster?
Example 4: What are my friends upto on farcaster?
`;

export const topCreatorsSwapExamples = `
Example 1: What are my friends buying?
Example 2: What are my creators buying?
Example 3: What are some interesting tokens to buy
`;

export const socialSummaryExamples = `
Example 1: What is the social activity of my creators?
Example 2: What is the hot on social media?
Example 3: What is new on social media?
Example 4: What are my friends upto?
`;

export const swapSummaryInputContextExtraction = `Analyze the following message and extract key information about the swap request: {{message}}

    Return JSON in this format:
    \`\`\`json
    {
    "isGeneralQuery": true/false,
    "onlyIncludeSpecifiedMoxieIds": true/false,
    "isTopTokenOwnersQuery": true/false,
    "timeFilter": {
        "startTimestamp": "YYYY-MM-DD HH:MM:SS",
        "endTimestamp": "YYYY-MM-DD HH:MM:SS"
    }
    }
    \`\`\`

    Examples:
    - "Show me trending tokens" -> isGeneralQuery: true, onlyIncludeSpecifiedMoxieIds: false, isTopTokenOwnersQuery: false
    - "Show swaps for M3 and M5" -> isGeneralQuery: false, onlyIncludeSpecifiedMoxieIds: true, isTopTokenOwnersQuery: false
    - "Show all swaps from last week" -> isGeneralQuery: true, timeFilter with appropriate timestamps, isTopTokenOwnersQuery: false
    - "Show M3's swaps from yesterday" -> isGeneralQuery: false, onlyIncludeSpecifiedMoxieIds: true, timeFilter with appropriate timestamps, isTopTokenOwnersQuery: false
    - "What are my top fan tokens doing in the market" -> isGeneralQuery: true, onlyIncludeSpecifiedMoxieIds: false, isTopTokenOwnersQuery: true
    - "Show me what my biggest token holders are trading" -> isGeneralQuery: true, onlyIncludeSpecifiedMoxieIds: false, isTopTokenOwnersQuery: true`;