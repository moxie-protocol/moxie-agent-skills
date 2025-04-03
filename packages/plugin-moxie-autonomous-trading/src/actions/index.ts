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
    minPurchaseAmount?: number;
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

        

        const traceId = message.id;
        const moxieUserInfo = state.moxieUserInfo as MoxieUser;
        const moxieUserId = moxieUserInfo.id;
        
        try {
            elizaLogger.debug(traceId,`[AUTONOMOUS_TRADING] [${moxieUserId}] [AUTONOMOUS_TRADING] Starting AUTONOMOUS_TRADING handler with user message: ${JSON.stringify(message)}`);

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
                 callback?.({
                    text: autonomousTradingResponse.error.prompt_message,
                    action: "AUTONOMOUS_TRADING",
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

            if (ruleType === 'GROUP_COPY_TRADE' || ruleType === 'GROUP_COPY_TRADE_AND_PROFIT') {
                ruleTriggers = 'GROUP';
                groupTradeParams = {
                    groupId: params.groupId,
                    condition: params.condition,
                    conditionValue: params.conditionValue,
                    minPurchaseAmount: {
                        valueType: 'USD',
                        amount: params.minPurchaseAmount
                    }
                };
            } else {
                ruleTriggers = 'USER';
                userTradeParams = {
                    moxieUsers: params.moxieIds,
                    minPurchaseAmount: {
                        valueType: 'USD',
                        amount: params.minPurchaseAmount
                    }
                };
            }

            if (ruleType === 'GROUP_COPY_TRADE_AND_PROFIT' || ruleType === 'COPY_TRADE_AND_PROFIT') {
                limitOrderParams = {
                    sellConditions: {
                        sellPercentage: 100,
                        priceChangePercentage: params.profitPercentage
                    },
                    limitOrderValidityInSeconds: params.timeDurationInSec
                };
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
                });

            } catch (error) {
                elizaLogger.error(traceId,`[autonomous trading] [${moxieUserId}] [AUTONOMOUS_TRADING] [ADD_RULE] error creating trading rule: ${error.message}`);
                 callback?.({
                    text: `Something went wrong while creating autonomous trading rule. Please try again later.`,
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
    description: "should be selected when the user wants to know what kind of rules are possible.",
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
