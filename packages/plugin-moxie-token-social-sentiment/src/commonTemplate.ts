export const tokenSocialSentimentTemplate = `

Gather data from the following farcaster casts: {{farcasterCasts}} and twitter posts: {{tweets}}, and use the following format to generate the output:

### Instructions:
For both platforms, perform the following analysis:

1. Sentiment Classification
   - Categorize the overall sentiment as Positive, Negative, or Neutral
   - If mixed, determine the dominant sentiment based on engagement metrics and content weight
   - Consider intensity of sentiment expressions (strongly positive vs slightly positive)


2. Key Themes & Insights
   - Identify primary topics including: bullish trends, bearish indicators, FUD, partnerships, price action, technological developments, or major events
   - Extract recurring narratives, concerns, or excitement expressed by the community
   - Note any significant disagreements or consensus points


3. Engagement Analysis
   - Evaluate the volume and quality of engagement (likes, reposts, replies, quote posts)
   - Determine if high-engagement posts skew toward particular sentiments
   - Identify influential voices and their impact on the conversation


4. Temporal Patterns (if timestamps available)
   - Note any sentiment shifts over the time period of the data
   - Identify potential catalysts for sentiment changes



### Output Format
# Farcaster Sentiment Analysis

# Overall Sentiment: [Positive/Negative/Neutral]
# Sentiment Strength: [Strong/Moderate/Weak]
# Key Insights:
    [2-3 concise points summarizing the main themes and community reactions]


# Most Discussed Topics: [List top 2-3 topics]
# Notable Trends: [Any emerging narratives or shifts worth monitoring]

# Twitter Sentiment Analysis

# Overall Sentiment: [Positive/Negative/Neutral]
# Sentiment Strength: [Strong/Moderate/Weak]
# Key Insights:
    [2-3 concise points summarizing the main themes and community reactions]


# Most Discussed Topics: [List top 2-3 topics]
# Notable Trends: [Any emerging narratives or shifts worth monitoring]

## Example 1:
userMoxieId: M2
latestMessage: Show me social sentiment for $moxie

## Example Output:
#Farcaster Sentiment:
sentiment: "Negative"
**Key Insights**:
    - The community is bearish on $moxie
    - There are a few new users joining the community
    - The price of $moxie is going down
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is bearish on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is going down
twitterSentiment:
    sentiment: "Negative"
**Key Insights**:
    - The community is bearish on $moxie
    - There are a few new users joining the community
    - The price of $moxie is going down
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is bearish on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is going down

## Example 2:
userMoxieId: M2
previousQuestion:
latestMessage: Show me social sentiment for $moxie

## Example Output:
###Farcaster Sentiment:
sentiment: "Neutral"
**Key Insights**:
    - The community is neutral on $moxie
    - There are a few new users joining the community
    - The price of $moxie is stable
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is neutral on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is stable
twitterSentiment:
    sentiment: "Neutral"
**Key Insights**:
    - The community is neutral on $moxie
    - There are a few new users joining the community
    - The price of $moxie is stable
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is neutral on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is stable


## Example 3:
userMoxieId: M2

previousQuestion:
latestMessage: show me social sentiment for $moxie

## Example Output:
###Farcaster Sentiment:
sentiment: "Negative"
**Key Insights**:
    - The community is bearish on $moxie
    - There are a few new users joining the community
    - The price of $moxie is going down
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is bearish on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is going down
twitterSentiment:
    sentiment: "Negative"
**Key Insights**:
    - The community is bearish on $moxie
    - There are a few new users joining the community
    - The price of $moxie is going down
**Most Discussed Topics:**:
    - The price of $moxie
    - The community is bearish on $moxie
    - There are a few new users joining the community
**Notable Trends**:
    - The price of $moxie is going down

---

## For these inputs, provide the output:

userMoxieId: {{userMoxieId}}

previousQuestions:
{{previousQuestion}}

latestMessage: {{latestMessage}}

Focus on recent messages.
`;
