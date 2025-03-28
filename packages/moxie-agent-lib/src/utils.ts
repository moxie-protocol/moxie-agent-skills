/**
 * Formats a user mention string with the given user ID and username for display in the UI
 * @param userId - The unique identifier of the user
 * @param userName - The display name of the user
 * @returns A formatted user mention string in the format @[username|userId]
 */
const formatUserMention = (userId: string, userName: string) => {
    return `@[${userName}|${userId}]`;
}

/**
 * Formats a group mention string with the given group ID and name for display in the UI
 * @param groupId - The unique identifier of the group
 * @param groupName - The display name of the group
 * @returns A formatted group mention string in the format #groupName|groupId
 */
const formatGroupMention = (groupId: string, groupName: string) => {
    return `#${groupName}|${groupId}`;
}

/**
 * Formats a token mention string with the given token symbol and address for display in the UI
 * @param tokenSymbol - The symbol of the token (e.g. ETH, USDC)
 * @param tokenAddress - The contract address of the token
 * @returns A formatted token mention string in the format $[symbol|address]
 */
const formatTokenMention = (tokenSymbol: string, tokenAddress: string) => {
    return `$[${tokenSymbol}|${tokenAddress}]`;
}

export { formatUserMention, formatGroupMention, formatTokenMention };