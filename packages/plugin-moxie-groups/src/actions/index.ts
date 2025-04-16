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
} from "@moxie-protocol/core";
import { MoxieClientWallet, MoxieUser, MoxieWalletClient, formatUserMention } from "@moxie-protocol/moxie-agent-lib";
import { BaseParams, createTradingRule, getAutonomousTradingRuleDetails, getErrorMessageFromCode, GroupTradeParams, LimitOrderParams, RuleType, 
    UserTradeParams, agentWalletNotFound, delegateAccessNotFound, moxieWalletClientNotFound, checkUserCommunicationPreferences } from "../utils/utility";
import { autonomousTradingTemplate } from "../templates";
import { addMembersToGroup, createGroup } from "../utils";
import { GroupOutput } from "../types";

export interface AutonomousTradingError {
    missing_fields: string[];
    prompt_message: string;
}

export interface ManageGroupsResponse {
    success: boolean;
    actionType?: string;
    pa
    params?: AutonomousTradingRuleParams;
    error: AutonomousTradingError | null;
}


export const autonomousTradingAction: Action = {
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
            elizaLogger.debug(traceId,`[MANAGE_GROUPS] [${moxieUserId}] [MANAGE_GROUPS] Starting MANAGE_GROUPS handler with user message: ${JSON.stringify(message)}`);

            // Compose manage groups context
            const manageGroupsContext = composeContext({
                state,
                template: manageGroupsTemplate,
            });

            // Generate manage groups content
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

            if (!manageGroupsResponse.success ) {
                elizaLogger.warn(traceId,`[manage groups] [${moxieUserId}] [MANAGE_GROUPS] [ADD_RULE] error occured while performing add rule operation: ${JSON.stringify(manageGroupsResponse.error)}`);
                 callback?.({
                    text: manageGroupsResponse.error.prompt_message,
                    action: "MANAGE_GROUPS",
                });
                return true;
            }

            // Extract parameters from response
            const { actionType, params } = manageGroupsResponse;
            
            if (actionType === 'CREATE_GROUP') {
                try {
                    const { groupName, groupDescription } = params;
                    const response = await createGroup(
                        state.authorizationHeader as string,
                        groupName
                    ) as GroupOutput;

                    await callback?.({
                        text: `✅ Group Created Successfully ! Group ID: ${response.group?.id}`,
                        action: "MANAGE_GROUPS",
                    });
                } catch (error) {
                    elizaLogger.error(traceId, `[manage groups] [${moxieUserId}] [MANAGE_GROUPS] Error creating group: ${error.message}`);
                    await callback?.({
                        text: `❌ Failed to create group. Please try again later.`,
                        action: "MANAGE_GROUPS",
                    });
                }
            } else if (actionType === 'CREATE_GROUP_AND_ADD_GROUP_MEMBER') {
                try {
                    const { groupName, groupDescription, moxieUserId } = params;
                    const response = await createGroup(
                        state.authorizationHeader as string,
                        groupName
                    ) as GroupOutput;

                    const addMembersResponse = await addMembersToGroup(
                        state.authorizationHeader as string,
                        response.group?.id,
                        [moxieUserId]
                    ) as GroupOutput;

                    if (addMembersResponse.success) {
                        await callback?.({
                            text: `✅ Group Created Successfully and added member! Group ID: ${response.group?.id}, Number of members added: ${addMembersResponse.group?.members.length}`,
                            action: "MANAGE_GROUPS",
                        });
                    } else {
                        await callback?.({
                            text: `❌ Failed to add member to group. Please try again later.`,
                            action: "MANAGE_GROUPS",
                        });
                    }
                } catch (error) {
                    elizaLogger.error(traceId, `[manage groups] [${moxieUserId}] [MANAGE_GROUPS] Error creating group and adding member: ${error.message}`);
                    await callback?.({
                        text: `❌ An error occurred while creating the group and adding the member. Please try again later.`,
                        action: "MANAGE_GROUPS",
                    });
                }
            } else if (actionType === 'ADD_GROUP_MEMBER') {
                const { groupId, moxieUserId } = params;
            } else if (actionType === 'DELETE_GROUP') {
                const { groupId } = params;
            } else if (actionType === 'REMOVE_GROUP_MEMBER') {
                const { groupId } = params;
            } else if (actionType === 'GET_GROUP_DETAILS') {
                const { groupId } = params;
            } else {
                elizaLogger.error(traceId,`[manage groups] [${moxieUserId}] [MANAGE_GROUPS] [ADD_RULE] invalid action type: ${actionType}`);
                callback?.({
                    text: `Something went wrong while managing groups. Please try again later.`,
                    action: "MANAGE_GROUPS",
                });
                return true;
            }



            try {
                const response = await createTradingRule(
                    state.authorizationHeader as string,
                    traceId,
                    ruleType as RuleType,
                    baseParams,
                    ruleTriggers,
                    groupTradeParams,
                    userTradeParams,
                    limitOrderParams
                );

                await callback?.({
                    text: `✅ Automation Rule Created Successfully!\n\n📌 Instruction: ${response.instructions}`,
                     action: "AUTONOMOUS_TRADING",
                     cta: communicationPreference === null ? "SETUP_ALERTS" : null
                });

            } catch (error) {
                elizaLogger.error(traceId,`[autonomous trading] [${moxieUserId}] [AUTONOMOUS_TRADING] [ADD_RULE] error creating trading rule: ${error.message}`);
                callback?.({
                    text: getErrorMessageFromCode(error),
                    action: "AUTONOMOUS_TRADING",
                });
            }

                
        } catch(error) {
            callback?.({
                text: `Something went wrong while creating autonomous trading rule. Please try again later.`,
                action: "AUTONOMOUS_TRADING",
            });
            elizaLogger.error(traceId,`[[autonomous trading]] [${moxieUserId}] [AUTONOMOUS_TRADING] [ADD_RULE] error occured while performing add rule operation: ${JSON.stringify(error)}`);

        }

        return true;

    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "buy 10$ worth tokens whenever @betashop and @jessepollak buy any token in 6 hours",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "buy 10$ worth tokens whenever @betashop and @jessepollak buy any token in 6 hours and sell it off when it makes a profit of 40%",
                    action: "AUTONOMOUS_TRADING",
                },
            },
        ],
    ] as ActionExample[][],
};

export const getAutonomousTradingRuleDetailAction: Action = {
    name: "COPY_TRADE_RULE_DETAILS",
    similes: ["AUTONOMOUS_TRADING_RULE_DETAILS"],
    description: "Select this action when the request is seeking information about possible automation types, available parameters, or general questions about what copy trading functionality exists. Example: 'What automations are possible?' or 'What kinds of trading rules can I create?",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {

        const user = state.moxieUserInfo as MoxieUser;

        const response = getAutonomousTradingRuleDetails(formatUserMention(user.id, user.userName));
        callback({
            text: response, 
            action: "COPY_TRADE_RULE_DETAILS",
            cta: ["COPY_TRADE", "GROUP_COPY_TRADE"]
        });
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "get details for a copy trade rule",
                },
            },
        ],
    ] as ActionExample[][],
};  
