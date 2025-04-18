import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    ModelClass,
    ModelProviderName,
    elizaLogger,
    composeContext,
    generateObjectDeprecated,
    streamText,
} from "@moxie-protocol/core";
import { MoxieUser, moxieUserService } from "@moxie-protocol/moxie-agent-lib";
import { manageGroupsTemplate, groupDetailsTemplate } from "../templates";
import { addMembersToGroup, createGroup, deleteGroup, getGroupDetails, removeMembersFromGroup, updateGroup } from "../utils";
import { GetGroupsOutput, GroupOutput } from "../types";

export interface ManageGroupsError {
    missing_fields: string[];
    prompt_message: string;
}

export interface GroupParams {
    groupId?: string;
    groupName?: string;
    senpiUserIdsToAdd?: string[];
    senpiUserIdsToRemove?: string[];
}

export interface ManageGroupsResponse {
    success: boolean;
    actionType?: string;
    params?: GroupParams;
    error: ManageGroupsError | null;
}

export interface GroupDetailsResponse {
    message: string;
}

export const manageGroupsAction: Action = {
    name: "MANAGE_GROUPS",
    similes: [
        "MANAGE_GROUPS",
        "ADD_GROUP_MEMBER",
        "REMOVE_GROUP_MEMBER",
        "MANAGE_GROUP_MEMBERS",
    ],
    description: "This action is designed for managing user groups, allowing users to create, modify, and delete groups, as well as add or remove members from these groups. It provides a comprehensive set of functionalities to handle group dynamics efficiently, ensuring seamless integration with the Senpi platform.",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        const traceId = message.id;
        const moxieUserInfo = state.moxieUserInfo as MoxieUser;
        const moxieUserId = moxieUserInfo.id;

        try {
            elizaLogger.debug(traceId, `[MANAGE_GROUPS] [${moxieUserId}] Starting handler with user message: ${JSON.stringify(message)}`);

            const manageGroupsContext = composeContext({
                state,
                template: manageGroupsTemplate,
            });

            const manageGroupsResponse = await generateObjectDeprecated({
                runtime,
                context: manageGroupsContext,
                modelClass: ModelClass.LARGE,
                modelConfigOptions: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    modelProvider: ModelProviderName.ANTHROPIC,
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    modelClass: ModelClass.LARGE,
                }
            }) as ManageGroupsResponse;

            if (!manageGroupsResponse.success) {
                elizaLogger.warn(traceId, `[MANAGE_GROUPS] Error: ${JSON.stringify(manageGroupsResponse.error)}`);
                callback?.({
                    text: manageGroupsResponse.error.prompt_message,
                    action: "MANAGE_GROUPS",
                });
                return true;
            }

            const { actionType, params } = manageGroupsResponse;

            switch (actionType) {
                case 'CREATE_GROUP':
                    await handleCreateGroup(traceId, moxieUserId, state, params, callback);
                    break;
                case 'CREATE_GROUP_AND_ADD_GROUP_MEMBER':
                    await handleCreateGroupAndAddMember(traceId, moxieUserId, state, params, callback);
                    break;
                case 'ADD_GROUP_MEMBER':
                    await handleAddGroupMember(traceId, moxieUserId, state, params, callback);
                    break;
                case 'DELETE_GROUP':
                    await handleDeleteGroup(traceId, moxieUserId, state, params, callback);
                    break;
                case 'REMOVE_GROUP_MEMBER':
                    await handleRemoveGroupMember(traceId, moxieUserId, state, params, callback);
                    break;
                case 'GET_GROUP_DETAILS':
                    await handleGetGroupDetails(traceId, runtime, message, state, params, callback);
                    break;
                case 'UPDATE_GROUP':
                    await handleUpdateGroup(traceId, moxieUserId, state, params, callback);
                    break;
                default:
                    elizaLogger.error(traceId, `[MANAGE_GROUPS] Invalid action type: ${actionType}`);
                    callback?.({
                        text: `Something went wrong while managing groups. Please try again later.`,
                        action: "MANAGE_GROUPS",
                    });
                    return true;
            }
        } catch (error) {
            elizaLogger.error(traceId, `[MANAGE_GROUPS] Unexpected error: ${JSON.stringify(error)}`);
            callback?.({
                text: `An unexpected error occurred. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }

        return true;
    },
    examples: [[],] as ActionExample[][],
};

async function handleCreateGroup(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupName } = params;
        if (!groupName) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [CREATE_GROUP] Group name is required`);
            await callback?.({
                text: `❌ Group name is required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await createGroup(state.authorizationHeader as string, groupName) as GroupOutput;
        await callback?.({
            text: `✅ Group #[${response.group?.name}|${response.group?.id}] created successfully! Start adding members to the group.`,
            action: "MANAGE_GROUPS",
        });
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error creating group: ${error.message}`);
        await callback?.({
            text: `❌ Failed to create group. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleCreateGroupAndAddMember(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupName, senpiUserIdsToAdd } = params;

        if (!groupName) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [CREATE_GROUP_AND_ADD_GROUP_MEMBER] Group name is required`);
            await callback?.({
                text: `❌ Group name is required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        if (!senpiUserIdsToAdd) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [CREATE_GROUP_AND_ADD_GROUP_MEMBER] Senpi user IDs to add is required`);
            await callback?.({
                text: `❌ Senpi user IDs to add is required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await createGroup(state.authorizationHeader as string, groupName) as GroupOutput;

        const addMembersResponse = await addMembersToGroup(state.authorizationHeader as string, response.group?.id, senpiUserIdsToAdd) as GroupOutput;

        if (addMembersResponse.success) {
            await callback?.({
                    text: `✅ Group #[${response.group?.name}|${response.group?.id}] created successfully and added ${addMembersResponse.group?.members.length} members to the group.`,
                    action: "MANAGE_GROUPS",
            });
        } else {
            await callback?.({
                text: `❌ Failed to add member to group. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error creating group and adding member: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while creating the group and adding the member. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleAddGroupMember(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupId, senpiUserIdsToAdd } = params;
        if (!groupId || !senpiUserIdsToAdd) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [ADD_GROUP_MEMBER] Group ID and Senpi user IDs to add are required`);
            await callback?.({
                text: `❌ Group ID and Senpi user IDs to add are required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await addMembersToGroup(state.authorizationHeader as string, groupId, senpiUserIdsToAdd) as GroupOutput;
        const moxieUserProfiles = await moxieUserService.getUserByMoxieIdMultipleMinimal(senpiUserIdsToAdd);
        const idToUsernameMap = new Map();
        moxieUserProfiles.forEach((user, id) => {
            idToUsernameMap.set(id, user.userName || id);
        });

        if (response.success) {
            await callback?.({
                text: `✅ ${senpiUserIdsToAdd?.length} member(s) added to group #[${response.group?.name}|${response.group?.id}] successfully! Added members: ${Array.from(idToUsernameMap.entries()).map(([id, username]) => `@[${username}|${id}]`).join(', ')}`,
                action: "MANAGE_GROUPS",
            });
        } else {
            await callback?.({
                text: `❌ Failed to add member to group. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error adding member to group: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while adding the member to the group. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleDeleteGroup(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupId } = params;
        if (!groupId) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [DELETE_GROUP] Group ID is required`);
            await callback?.({
                text: `❌ Group ID is required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await deleteGroup(state.authorizationHeader as string, groupId) as GroupOutput;

        if (response.success) {
            await callback?.({
                text: `✅ Group deleted successfully!`,
                action: "MANAGE_GROUPS",
            });
        } else {
            await callback?.({
                text: `❌ Failed to delete group. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error deleting group: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while deleting the group. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleRemoveGroupMember(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupId, senpiUserIdsToRemove } = params;
        if (!groupId || !senpiUserIdsToRemove) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [REMOVE_GROUP_MEMBER] Group ID and Senpi user IDs to remove are required`);
            await callback?.({
                text: `❌ Group ID and Senpi user IDs to remove are required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await removeMembersFromGroup(state.authorizationHeader as string, groupId, senpiUserIdsToRemove) as GroupOutput;

        const moxieUserProfiles = await moxieUserService.getUserByMoxieIdMultipleMinimal(senpiUserIdsToRemove);
        const idToUsernameMap = new Map();
        moxieUserProfiles.forEach((user, id) => {
            idToUsernameMap.set(id, user.userName || id);
        });

        if (response.success) {
            await callback?.({
                text: `✅ ${senpiUserIdsToRemove?.length} member(s) removed from group #[${response.group?.name}|${response.group?.id}] successfully! Removed members: ${Array.from(idToUsernameMap.entries()).map(([id, username]) => `@[${username}|${id}]`).join(', ')}`,
                action: "MANAGE_GROUPS",
            });
        } else {
            await callback?.({
                text: `❌ Failed to remove member from group. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error removing member from group: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while removing the member from the group. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleGetGroupDetails(traceId: string, runtime: IAgentRuntime, message: Memory, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupId } = params;

        let response: GetGroupsOutput;
        if (!groupId) {
            response = await getGroupDetails(state.authorizationHeader as string) as GetGroupsOutput;
        } else {
            response = await getGroupDetails(state.authorizationHeader as string, groupId) as GetGroupsOutput;
        }

        if (response.groups.length === 0) {
            await callback?.({
                text: `No groups found!`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const groupDetails = response.groups;

        elizaLogger.debug(traceId, `[MANAGE_GROUPS] [GET_GROUP_DETAILS] <<<Group details>>>: ${JSON.stringify(groupDetails)}`);

        const memberIds: Set<string> = new Set();
            groupDetails.forEach(group => {
                (group.members || []).forEach(member => {
                if (member?.moxieUserId) {
                    memberIds.add(member.moxieUserId);
                }
                });
        });

        elizaLogger.debug(traceId, `[MANAGE_GROUPS] [GET_GROUP_DETAILS] Member IDs: ${Array.from(memberIds).join(", ")}`);

        const moxieUserProfiles = await moxieUserService.getUserByMoxieIdMultipleMinimal(Array.from(memberIds));

        const userDetails: Record<string, string> = {};

        // Step 1: Fill from user profiles
        for (const [id, user] of moxieUserProfiles.entries()) {
            userDetails[id] = user.userName ?? id;
        }

        // Step 2: Add fallback for any missing member IDs
        for (const id of memberIds) {
            if (!(id in userDetails)) {
                elizaLogger.warn(`[MANAGE_GROUPS] Missing user profile for ID: ${id}`);
                userDetails[id] = id;
            }
        }

        elizaLogger.debug(traceId, `[MANAGE_GROUPS] [GET_GROUP_DETAILS] Group details: ${JSON.stringify(groupDetails)}`);
        elizaLogger.debug(traceId, `[MANAGE_GROUPS] [GET_GROUP_DETAILS] User details: ${JSON.stringify(userDetails)}`);

        const newState = await runtime.composeState(message, {
            currentDate: new Date().toLocaleString(),
            groupDetails: JSON.stringify(groupDetails),
            userDetails: JSON.stringify(userDetails),
        });

        elizaLogger.debug(traceId, `[MANAGE_GROUPS] [GET_GROUP_DETAILS] New state: ${JSON.stringify(newState)}`);

        const context = composeContext({
            state: newState,
            template: groupDetailsTemplate,
        });

        const groupDetailsResponse = await generateObjectDeprecated({
            runtime,
            context,
            modelClass: ModelClass.LARGE,
            modelConfigOptions: {
                temperature: 0.1,
                maxOutputTokens: 8192,
                modelProvider: ModelProviderName.ANTHROPIC,
                apiKey: process.env.ANTHROPIC_API_KEY,
                modelClass: ModelClass.LARGE,
            }
        }) as GroupDetailsResponse;

        for await (const textPart of groupDetailsResponse.message) {
            callback({ text: textPart, action: "MANAGE_GROUPS" });
        }

    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error retrieving group details: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while retrieving the group details. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}

async function handleUpdateGroup(traceId: string, moxieUserId: string, state: State, params: GroupParams, callback: HandlerCallback) {
    try {
        const { groupId, groupName } = params;
        if (!groupId || !groupName) {
            elizaLogger.warn(traceId, `[MANAGE_GROUPS] [UPDATE_GROUP] Group ID and Group Name are required`);
            await callback?.({
                text: `❌ Group ID and Group Name are required. Please try again.`,
                action: "MANAGE_GROUPS",
            });
            return;
        }

        const response = await updateGroup(state.authorizationHeader as string, groupId, groupName) as GroupOutput;

        if (response.success) {
            await callback?.({
                text: `✅ Group updated successfully! Updated group name is: ${groupName}`,
                action: "MANAGE_GROUPS",
            });
        } else {
            await callback?.({
                text: `❌ Failed to update group. Please try again later.`,
                action: "MANAGE_GROUPS",
            });
        }
    } catch (error) {
        elizaLogger.error(traceId, `[MANAGE_GROUPS] Error updating group: ${error.message}`);
        await callback?.({
            text: `❌ An error occurred while updating the group. Please try again later.`,
            action: "MANAGE_GROUPS",
        });
    }
}