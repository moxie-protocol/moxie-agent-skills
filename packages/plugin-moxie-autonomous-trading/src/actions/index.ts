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
import { MoxieUser, formatUserMention } from "@moxie-protocol/moxie-agent-lib";
import { BaseParams, createTradingRule, getAutonomousTradingRuleDetails, GroupTradeParams, LimitOrderParams, RuleType, UserTradeParams } from "../utils/utility";
import { autonomousTradingTemplate } from "../templates";


export interface AutonomousTradingRuleParams {
    moxieIds?: string[];
    groupId?: string;
    timeDurationInSec: number;
    amountInUSD: number;
    profitPercentage?: number;
    condition?: 'ANY' | 'ALL';
    conditionValue?: number;
}

export interface AutonomousTradingError {
    missing_fields: string[];
    prompt_message: string;
}

export interface AutonomousTradingResponse {
    success: boolean;
    ruleType?: string;
    is_followup: boolean;
    params?: AutonomousTradingRuleParams;
    error: AutonomousTradingError | null;
}


export const autonomousTradingAction: Action = {
    name: "AUTONOMOUS_TRADING",
    similes: [
        "COPY_TRADE",
        "COPY_TRADES",
        "COPY_TRADE_WITH_PROFIT",
        "GROUP_COPY_TRADE",
        "GROUP_COPY_TRADES",
        "GROUP_COPY_TRADE_WITH_PROFIT",
    ],
    description: "Helps you set up copy trade rules to automatically follow other traders and groups.",
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
            elizaLogger.debug(traceId,`[tokenSwap] [${moxieUserId}] [tokenSwapAction] Starting creatorCoinSwap handler with user message: ${JSON.stringify(_message, (key, value) => key === 'embedding' ? undefined : value)}`);

            // Compose swap context
            const swapContext = composeContext({
                state,
                template: autonomousTradingTemplate,
            });

            // Generate swap content
            const autonomousTradingResponse = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.LARGE,
                modelConfigOptions: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    modelProvider: ModelProviderName.ANTHROPIC,
                    apiKey: process.env.ANTHROPIC_API_KEY,
                    modelClass: ModelClass.LARGE,
                }
            }) as AutonomousTradingResponse;

            if (!autonomousTradingResponse.success ) {
                elizaLogger.warn(traceId,`[autonomous trading] [${moxieUserId}] [AUTONOMOUS_TRADING] [ADD_RULE] error occured while performing add rule operation: ${JSON.stringify(autonomousTradingResponse.error)}`);
                await callback?.({
                    text: autonomousTradingResponse.error.prompt_message,
                    content: {
                        action: "AUTONOMOUS_TRADING",
                    }
                });
                return true;
            }

            // Extract parameters from response
            const {ruleType, params} = autonomousTradingResponse;
            
            const baseParams: BaseParams = {
                buyAmount: params.amountInUSD,
                duration: params.timeDurationInSec,
                buyAmountValueType: 'USD',
                sellToken:  {
                    symbol: 'ETH',
                    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
                }
            };

            let groupTradeParams: GroupTradeParams;
            let userTradeParams: UserTradeParams;
            let limitOrderParams: LimitOrderParams;
            let ruleTriggers: 'GROUP' | 'USER';

            if (ruleType.startsWith('GROUP_')) {
                ruleTriggers = 'GROUP';
                groupTradeParams = {
                    groupId: params.groupId,
                    condition: 'ANY',
                    conditionValue: params.conditionValue
                };
            } else {
                ruleTriggers = 'USER';
                userTradeParams = {
                    moxieUsers: params.moxieIds
                };
            }

            if (ruleType.includes('_AND_PROFIT')) {
                limitOrderParams = {
                    sellConditions: {
                        sellPercentage: 100,
                        priceChangePercentage: params.profitPercentage
                    },
                    limitOrderValidity: params.timeDurationInSec
                };
            }

            try {
                const result = await createTradingRule(
                    traceId,
                    ruleType as RuleType,
                    baseParams,
                    ruleTriggers,
                    groupTradeParams,
                    userTradeParams,
                    limitOrderParams
                );

                await callback?.({
                    text: `Successfully created trading rule with ID: ${result.ruleId}`,
                    content: {
                        action: "AUTONOMOUS_TRADING",
                        ruleId: result.ruleId,
                        status: result.status
                    }
                });

            } catch (error) {
                elizaLogger.error(traceId,`[autonomous trading] [${moxieUserId}] [AUTONOMOUS_TRADING] [ADD_RULE] error creating trading rule: ${error.message}`);
                await callback?.({
                    text: `Failed to create trading rule: ${error.message}`,
                    content: {
                        action: "AUTONOMOUS_TRADING",
                        error: error.message
                    }
                });
            }

                
        } catch(error) {

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
                    action: "COPY_TRADE_AND_PROFIT",
                },
            },
        ],
    ] as ActionExample[][],
};

export const getAutonomousTradingRuleDetailAction: Action = {
    name: "COPY_TRADE_RULE_DETAILS",
    similes: ["AUTONOMOUS_TRADING_RULE_DETAILS"],
    description: "Provides details about available copy trading rules and automation options. Use this action to explain trading automation capabilities, rule configurations, and how users can set up copy trading with specific triggers and conditions.",
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
