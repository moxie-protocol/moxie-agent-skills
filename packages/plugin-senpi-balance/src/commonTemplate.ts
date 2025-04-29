export const portfolioUserIdsExtractionTemplate = `
Extract the list of users whose portfolio information or creator coin portfolio information is requested and return the result in JSON format.

## Instructions:
1. Identify user mentions in "latestMessage" using the pattern @[username|MoxieID].
2. If no mentions are found, refer to "previousQuestion" for potential references.
3. Address edge cases:
   - Handle duplicate user mentions.
   - Account for variations in username formats.
   - Resolve ambiguous user references.
   - Include self-references.
4. Ensure extracted MoxieIDs from @[username|MoxieID] are unique.

## Example 1:
userMoxieId: M2
latestMessage: Show me Creator Coin Holdings for @[user1|M123] @[user2|M456]

## Example JSON Output:
{
  "requestedUsers": ["M4", "M19"]
}

## Example 2:
userMoxieId: M2
previousQuestion:
latestMessage: Show me the portfolio of @[John Doe|M4] and me

## Example JSON Output:
{
  "requestedUsers": ["M4", "M2"]
}

## Example 3:
userMoxieId: M2

previousQuestion:
{Agent: show me twitter summary for @[John Doe|M4] and @[Jane Smith|M19]}

latestMessagee: show me the portfolio for those two users

## Example JSON Output:
{
  "requestedUsers": ["M4", "M19"]
}

---

## For these inputs, provide the JSON output:

userMoxieId: {{userMoxieId}}

previousQuestions:
{{previousQuestion}}

latestMessage: {{latestMessage}}

Focus on recent messages.
`;