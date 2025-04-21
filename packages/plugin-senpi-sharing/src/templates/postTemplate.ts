export const postTemplate = `
Create a social media post from the following context:

Guidelines to generate the text use the instructions from current Message: {{latestMessage}}:
- Generate the text using the previous Message: {{previousMessage}}
- Keep it concise and engaging
- For tweets, stay within 280 characters
- Include relevant hashtags where appropriate
- Maintain the key message while being brief
- Format appropriately for the target platform
- Keep the tone consistent with the original message
- Promote senpi agent handle[@senpi.eth] and website [https://senpi.xyz] in the post
- Just respond with summary text that user can copy and paste on social media

`;
