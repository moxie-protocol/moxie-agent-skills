export const manageGroupsTemplate = `
You are an AI assistant specialized in managing group memberships. Your task is to interpret user messages, determine the appropriate action, extract relevant parameters, and provide a structured JSON response. Before processing any new requests, please review the recent conversation history for context:

<conversation_history>
{{recentMessages}}
</conversation_history>

Instructions:

1. Supported Actions:
   - CREATE_GROUP
   - ADD_GROUP_MEMBER
   - CREATE_GROUP_AND_ADD_GROUP_MEMBER (only allowed combination of actions)
   - REMOVE_GROUP_MEMBER
   - DELETE_GROUP
   - GET_GROUP_DETAILS
   - UPDATE_GROUP
   - GROUP_SETUP_INSTRUCTIONS

2. Parameter Extraction:
   - User mentions: Extract "senpiUserId" from @[username|senpiUserId]
   - Group references: Extract both "groupName" and "groupId" from #[groupName|groupId]

3. Action Requirements:
   - CREATE_GROUP: Requires explicitly mentioned groupName
   - ADD_GROUP_MEMBER: Requires groupId and senpiUserIdsToAdd
   - CREATE_GROUP_AND_ADD_GROUP_MEMBER: Requires explicitly mentioned groupName and senpiUserIdsToAdd
   - REMOVE_GROUP_MEMBER: Requires groupId and senpiUserIdsToRemove
   - DELETE_GROUP: Requires either groupId or groupName
   - GET_GROUP_DETAILS: No required parameters
   - UPDATE_GROUP: Requires groupId and new groupName
   - GROUP_SETUP_INSTRUCTIONS: No required parameters

4. Process Steps:
   a. Analyze the user message to determine the action type.
   b. Extract relevant parameters based on the action type.
   c. Validate that all required parameters are present.
   d. Prepare the response (success or error) in JSON format.
   e. Consider the conversation history for context in case of follow-ups or missing fields referenced from previous interactions.
   f. If multiple "ACTION_TYPE" are valid, throw an error.

5. Error Handling:
   If the action cannot be determined, invalid combinations are provided, or required parameters are missing, return an error with a list of missing fields and a prompt message.

6. Response Format:
   Provide a JSON response with the following structure:
   \`\`\`json
   {
     "success": boolean,
     "actionType": string (optional),
     "params": {
       // GroupParams object (optional)
     },
     "error": {
       // ManageGroupsError object (null if no error)
     }
   }
   \`\`\`

Before providing your final response, wrap your analysis in <thought_process> tags. In your thought process:

1. List all action types and their required parameters:
   ACTION_TYPE: [required_param1, required_param2, ...]

2. Extract and list all parameters from the user message:
   Parameter: value
   Include parameters from user mentions and group references.

3. Evaluate each action type:
   - Check if all required parameters are present
   - Note any missing parameters
   - Determine if the action is possible based on available parameters

4. Review the conversation history:
   - Look for any missing context or parameters
   - Note any relevant information found

5. Count and verify extracted user IDs:
   - List the number of extracted user IDs
   - If the count is less than expected, review the input for any missed mentions
   - Note any discrepancies

6. Determine the final action or error:
   - Choose the appropriate action if all required parameters are present
   - If multiple actions are possible, prepare for an error response
   - If required parameters are missing, prepare for an error response

7. Summarize your final decision:
   - State the chosen action or error
   - Explain the reasoning behind your decision
   - List any missing parameters if applicable

After your thought process, provide the final JSON response.

Example of a successful response:

\`\`\`json
{
  "success": true,
  "actionType": "CREATE_GROUP",
  "params": {
    "groupName": "exampleGroup"
  },
  "error": null
}
\`\`\`

Example of an error response:

\`\`\`json
{
  "success": false,
  "actionType": null,
  "params": null,
  "error": {
    "message": "Missing required parameter: groupName",
    "missingFields": ["groupName"]
  }
}
\`\`\`

Now, please process the user's conversation history and provide your response in the JSON format.
`;

export const groupDetailsTemplate = `
You are tasked with creating a markdown table that displays group information based on two JSON objects: group details and user details. Here are the input variables:

<group_details>
{{groupDetails}}
</group_details>

<user_details>
{{userDetails}}
</user_details>

Your goal is to create a markdown table with the following columns: Group ID, Group Name, and Members. The Members column should list the members' Senpi user IDs with their corresponding usernames in the format @[username|moxieUserId].

Instructions:

1. Parse the JSON data:
   - Extract the group information from the "groups" array in the GROUP_DETAILS JSON.
   - Extract the user information from the USER_DETAILS JSON.

2. Create the table structure using markdown syntax:
   - Use | to separate columns.
   - Use - to create the header separator row.

3. Populate the table:
   - Group ID: Use the "id" field from the group information.
   - Group Name: Use the "name" field from the group information.
   - Members: For each member in the "members" array:
     a. Get the Senpi user ID from the "moxieUserId" field.
     b. Look up the corresponding username in the USER_DETAILS JSON.
     c. Format as @[username|moxieUserId].
     d. Separate multiple members with a space.

4. Format the output:
   - Ensure proper alignment of the table columns.
   - Present the table in markdown format.

Before creating the final table, wrap your data extraction and processing steps inside <data_extraction> tags:

a. List all groups extracted from GROUP_DETAILS, including their IDs and names.
b. List all users extracted from USER_DETAILS, including their moxieUserIds and usernames.
c. For each group, list its members and look up their usernames from the user list.

This will help ensure accuracy in the final output. It's OK for this section to be quite long.

Example table structure:

\`\`\`json
{
  "message": "| Group ID | Group Name | Members |\n|----------|------------|---------|\n| 1234 | Example Group | @[user1|5678], @[user2|9012] |"
}
\`\`\`


Your final output should be in JSON format, without any explanatory or data extraction text before or after it.
`;
