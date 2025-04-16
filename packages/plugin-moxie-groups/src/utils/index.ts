import { elizaLogger } from '@moxie-protocol/core';
import { gql } from 'graphql-request';
import { GetGroupsInput, GetGroupsOutput, GroupOutput, CreateGroupInput, UpdateGroupInput, DeleteGroupInput, ModifyGroupMembersInput, Status, DeleteGroupOutput } from '../types';

export const GET_GROUPS = gql`
    query GetGroups($input: GetGroupsInput!) {
        GetGroups(input: $input) {
            groups {
                id
                name
                createdBy
                members {
                    moxieUserId
                }
            }
        }
    }
`;

export const CREATE_GROUP = gql`
    mutation CreateGroup($input: CreateGroupInput!) {
        CreateGroup(input: $input) {
            success
            message
            group {
                id
                name
                createdBy
                members {
                    moxieUserId
                }
            }
        }
    }
`;

export const UPDATE_GROUP = gql`
    mutation UpdateGroup($input: UpdateGroupInput!) {
        UpdateGroup(input: $input) {
            success
            message
            group {
                id
                name
                createdBy
                createdAt
                updatedAt
                members {
                    moxieUserId
                    createdAt
                    updatedAt
                    status
                }
                status
            }
            membersNotAdded
        }
    }
`;

export const DELETE_GROUP = gql`
    mutation DeleteGroup($input: DeleteGroupInput!) {
        DeleteGroup(input: $input) {
            success
        }
    }
`;

export const ADD_MEMBERS_TO_GROUP = gql`
    mutation AddMembersToGroup($input: ModifyGroupMembersInput!) {
        AddMembersToGroup(input: $input) {
            success
            message
            group {
                id
                name
                createdBy
                createdAt
                updatedAt
                members {
                    moxieUserId
                    createdAt
                    updatedAt
                    status
                }
                status
            }
            membersNotAdded
        }
    }
`;

export const REMOVE_MEMBERS_FROM_GROUP = gql`
    mutation RemoveMembersFromGroup($input: ModifyGroupMembersInput!) {
        RemoveMembersFromGroup(input: $input) {
            success
            message
            group {
                id
                name
                createdBy
                createdAt
                updatedAt
                members {
                    moxieUserId
                    createdAt
                    updatedAt
                    status
                }
                status
            }
            membersNotAdded
        }
    }
`;

export async function getGroups(
    authorizationHeader: string,
    groupId?: string,
    groupName?: string,
    skip: number = 0,
    take: number = 10,
): Promise<GetGroupsOutput> {
    elizaLogger.info('getGroups called', { groupId, groupName, skip, take });

    try {
        const input: GetGroupsInput = {
            ...(groupId && { groupId }),
            ...(groupName && { groupName }),
            ...(skip !== undefined && { skip }),
            ...(take !== undefined && { take })
        };

        elizaLogger.debug('getGroups input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: GET_GROUPS,
                variables: { input }
            })
        });

        elizaLogger.debug('getGroups fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('getGroups failed', { errors: result.errors });
            throw new Error(`Failed to get groups: ${result.errors[0].message}`);
        }

        elizaLogger.info('getGroups successful', { data: result.data.GetGroups });
        return result.data.GetGroups;
    } catch (error) {
        elizaLogger.error('Error in getGroups', { error: error.message });
        throw new Error(`Error fetching groups: ${error.message}`);
    }
}

export async function createGroup(
    authorizationHeader: string,
    name: string
): Promise<GroupOutput> {
    elizaLogger.info('createGroup called', { name });

    try {
        if (!name) {
            elizaLogger.warn('createGroup failed due to missing name');
            throw new Error('Group name is required to create a group');
        }

        const input: CreateGroupInput = { name };
        elizaLogger.debug('createGroup input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: CREATE_GROUP,
                variables: { input }
            })
        });

        elizaLogger.debug('createGroup fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('createGroup failed', { errors: result.errors });
            throw new Error(`Failed to create group: ${result.errors[0].message}`);
        }

        elizaLogger.info('createGroup successful', { data: result.data.CreateGroup });
        return result.data.CreateGroup;
    } catch (error) {
        elizaLogger.error('Error in createGroup', { error: error.message });
        throw new Error(`Error creating group: ${error.message}`);
    }
}

export async function updateGroup(
    authorizationHeader: string,
    groupId: string,
    name?: string,
    groupStatus?: Status
): Promise<GroupOutput> {
    elizaLogger.info('updateGroup called', { groupId, name, groupStatus });

    try {
        if (!groupId) {
            elizaLogger.warn('updateGroup failed due to missing groupId');
            throw new Error('Group ID is required to update a group');
        }

        const input: UpdateGroupInput = { groupId, ...(name && { name }), ...(groupStatus && { groupStatus }) };
        elizaLogger.debug('updateGroup input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: UPDATE_GROUP,
                variables: { input }
            })
        });

        elizaLogger.debug('updateGroup fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('updateGroup failed', { errors: result.errors });
            throw new Error(`Failed to update group: ${result.errors[0].message}`);
        }

        elizaLogger.info('updateGroup successful', { data: result.data.UpdateGroup });
        return result.data.UpdateGroup;
    } catch (error) {
        elizaLogger.error('Error in updateGroup', { error: error.message });
        throw new Error(`Error updating group: ${error.message}`);
    }
}

export async function deleteGroup(
    authorizationHeader: string,
    groupId: string,
    groupName?: string
): Promise<DeleteGroupOutput> {
    elizaLogger.info('deleteGroup called', { groupId, groupName });

    try {
        if (!groupId) {
            elizaLogger.warn('deleteGroup failed due to missing groupId');
            throw new Error('Group ID is required to delete a group');
        }

        const input: DeleteGroupInput = { groupId, ...(groupName && { groupName }) };
        elizaLogger.debug('deleteGroup input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: DELETE_GROUP,
                variables: { input }
            })
        });

        elizaLogger.debug('deleteGroup fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('deleteGroup failed', { errors: result.errors });
            throw new Error(`Failed to delete group: ${result.errors[0].message}`);
        }

        elizaLogger.info('deleteGroup successful', { data: result.data.DeleteGroup });
        return result.data.DeleteGroup;
    } catch (error) {
        elizaLogger.error('Error in deleteGroup', { error: error.message });
        throw new Error(`Error deleting group: ${error.message}`);
    }
}

export async function addMembersToGroup(
    authorizationHeader: string,
    groupId: string,
    members: string[]
): Promise<GroupOutput> {
    elizaLogger.info('addMembersToGroup called', { groupId, members });

    try {
        if (!groupId) {
            elizaLogger.warn('addMembersToGroup failed due to missing groupId');
            throw new Error('Group ID is required to add members to a group');
        }

        const input: ModifyGroupMembersInput = { groupId, members };
        elizaLogger.debug('addMembersToGroup input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: ADD_MEMBERS_TO_GROUP,
                variables: { input }
            })
        });

        elizaLogger.debug('addMembersToGroup fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('addMembersToGroup failed', { errors: result.errors });
            throw new Error(`Failed to add members to group: ${result.errors[0].message}`);
        }

        elizaLogger.info('addMembersToGroup successful', { data: result.data.AddMembersToGroup });
        return result.data.AddMembersToGroup;
    } catch (error) {
        elizaLogger.error('Error in addMembersToGroup', { error: error.message });
        throw new Error(`Error adding members to group: ${error.message}`);
    }
}

export async function removeMembersFromGroup(
    authorizationHeader: string,
    groupId: string,
    members: string[]
): Promise<GroupOutput> {
    elizaLogger.info('removeMembersFromGroup called', { groupId, members });

    try {
        if (!groupId) {
            elizaLogger.warn('removeMembersFromGroup failed due to missing groupId');
            throw new Error('Group ID is required to remove members from a group');
        }

        const input: ModifyGroupMembersInput = { groupId, members };
        elizaLogger.debug('removeMembersFromGroup input constructed', { input });

        const data = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: REMOVE_MEMBERS_FROM_GROUP,
                variables: { input }
            })
        });

        elizaLogger.debug('removeMembersFromGroup fetch completed', { status: data.status });

        const result = await data.json();
        if (result.errors) {
            elizaLogger.error('removeMembersFromGroup failed', { errors: result.errors });
            throw new Error(`Failed to remove members from group: ${result.errors[0].message}`);
        }

        elizaLogger.info('removeMembersFromGroup successful', { data: result.data.RemoveMembersFromGroup });
        return result.data.RemoveMembersFromGroup;
    } catch (error) {
        elizaLogger.error('Error in removeMembersFromGroup', { error: error.message });
        throw new Error(`Error removing members from group: ${error.message}`);
    }
}