import { elizaLogger } from '@moxie-protocol/core';
import { gql } from 'graphql-request';

export type RuleType = 'COPY_TRADE' | 'COPY_TRADE_AND_PROFIT' | 'GROUP_COPY_TRADE' | 'GROUP_COPY_TRADE_AND_PROFIT';

export interface SellToken {
    symbol: string;
    address: string;
}


export interface Amount {
    valueType: 'USD';
    amount: number;
}

export interface BaseParams {
    buyAmount: number;
    duration: number;
    buyAmountValueType: 'USD';
    sellToken: SellToken;
}

export interface LimitOrderParams {
    sellConditions: {
        sellPercentage: number;
        priceChangePercentage: number;
    };
    limitOrderValidityInSeconds: number;
}

export interface GroupTradeParams {
    groupId: string;
    condition: 'ANY' | 'ALL';
    conditionValue: number;
    minPurchaseAmount: Amount
}

export interface UserTradeParams {
    moxieUsers: string[];
    minPurchaseAmount: Amount;
}

export interface CreateRuleInput {
    requestId: string;
    ruleType: RuleType;
    ruleParameters: {
        baseParams: BaseParams;
        limitOrderParams?: LimitOrderParams;
        groupTradeParams?: GroupTradeParams;
        userTradeParams?: UserTradeParams;
    };
    ruleTrigger: 'GROUP' | 'USER';
}

export interface CreateRuleResponse {
    id: string;
    requestId: string;
    ruleType: string;
    status: string;
    instructions: string;
}

const mutation = gql`
    mutation CreateRule($createRuleInput: CreateRuleInput!) {
        CreateRule(input: $createRuleInput) {
            id
            requestId
            ruleType
            status
            instructions
        }
    }
`;

// errorMessages.ts

const errorMessages: Record<string, string> = {
    AERR001: "Some required fields are missing. Please make sure you've provided all the necessary details.",
    AERR002: "We couldn’t understand who should trigger the rule — is it an copy trade or a group copy trade?",
    AERR003: "We need basic trading details to create this rule. Please add those.",
    AERR004: "The amount to buy must be more than zero.",
    AERR005: "Please choose whether the buy amount is in dollars.",
    AERR006: "Duration must be a positive number (like minutes or hours or seconds).",
    AERR007: "The token name you're selling to buy incoming tokens is missing. Please provide it.",
    AERR008: "The address of the token you're selling to buy incoming tokens is missing. Please add it.",
    AERR009: "The token address which you're selling to buy incoming tokens doesn't look right. Please check if it's a valid wallet address.",
    AERR010: "We need user-specific trade details to continue. (e.g. @username)",
    AERR011: "The minimum purchase amount must be a positive number.",
    AERR012: "Please choose if the minimum amount is in dollars.",
    AERR013: "To use a group-based rule, group details are needed. (e.g. #groupname)",
    AERR014: "At least one user must be selected to copy trades from.",
    AERR015: "You're using a user-based rule — group settings should not be included.",
    AERR016: "You cannot copy trades from yourself.",
    AERR017: "Missing group-based settings. Please provide group ID and conditions.",
    AERR018: "Group rules must include both the group and the condition (like ALL or ANY).",
    AERR019: "Please tell us how many members should meet the condition.",
    AERR020: "The condition value must be zero or higher.",
    AERR021: "You’re using a group rule — user-based settings should not be included.",
    AERR022: "To use profit-taking, please define when to sell.",
    AERR023: "At least one sell condition (e.g., price goes up by 10%) is required.",
    AERR024: "Both price change % and sell % must be numbers.",
    AERR025: "The price change percentage must be more than 0.",
    AERR026: "The sell percentage must be more than 0.",
    AERR027: "Set how long the limit order should stay active — it must be a positive number.",
    AERR028: "Limit order settings are only allowed for profit-taking rules.",
    AERR029: "Please provide sell conditions to enable profit-taking.",
    AERR030: "We couldn’t generate the rule’s instructions. Please check the details.",
    AERR031: "You’re not authorized. Please sign in again.",
    AERR032: "We couldn’t find your user account. Please try reconnecting.",
    AERR033: "We had trouble fetching your rules. Please try again shortly.",
    AERR034: "Something went wrong while creating the rule. Please try again.",
    AERR035: "We couldn’t delete one or more rules. Please make sure you created them.",
    AERR036: "We had trouble loading your automation logs. Please try again.",
    AERR037: "We couldn’t find the group. Please check the group ID.",
    AERR038: "You’ve set a condition that’s higher than the number of people in the group.",
  };
  
export function getErrorMessageFromCode(error: Error | string): string {
    const errorMsg = typeof error === "string" ? error : error.message;
    const match = errorMsg.match(/(AERR\d{3})/);
    const code = match?.[1];
    return code && errorMessages[code]
        ? errorMessages[code]
        : "Something went wrong. Please check your input or try again.";
}
  

export async function createTradingRule(
    authorizationHeader: string,
    requestId: string,
    ruleType: RuleType,
    baseParams: BaseParams,
    ruleTrigger: 'GROUP' | 'USER',
    groupTradeParams?: GroupTradeParams,
    userTradeParams?: UserTradeParams,
    limitOrderParams?: LimitOrderParams
): Promise<CreateRuleResponse> {
    
    // Ensure either groupTradeParams or userTradeParams is provided, but not both
    if (ruleTrigger === 'GROUP' && !groupTradeParams) {
        throw new Error('Please provide groupTradeParams (e.g. #groupname, condition: ANY|ALL, conditionValue: number, minPurchaseAmount: number) when using a GROUP rule.');
    }
    if (ruleTrigger === 'USER' && !userTradeParams) {
        throw new Error('Please provide userTradeParams (e.g. @username, minPurchaseAmount: number) when using a USER rule.'); 
    }

    if (groupTradeParams && userTradeParams) {
        throw new Error('Provide only one: groupTradeParams or userTradeParams, not both.');
    }

    const createRuleInput: CreateRuleInput = {
        requestId,
        ruleType,
        ruleParameters: {
            baseParams
        },
        ruleTrigger
    };

    if (limitOrderParams) {
        createRuleInput.ruleParameters.limitOrderParams = limitOrderParams;
    }

    if (groupTradeParams) {
        createRuleInput.ruleParameters.groupTradeParams = groupTradeParams;
    }

    if (userTradeParams) {
        createRuleInput.ruleParameters.userTradeParams = userTradeParams;
    }

    try {
        const response = await fetch(process.env.RULE_API_MOXIE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authorizationHeader
            },
            body: JSON.stringify({
                query: mutation,
                variables: { createRuleInput }
            })
        });

        const result = await response.json();

        if (result.errors) {
            throw new Error(`Failed to create rule: ${result.errors[0].message}`);
        }

        return result.data.CreateRule as CreateRuleResponse;

    } catch (error) {
        elizaLogger.error(`CreateRule failed: ${error}`);
        throw new Error(`Error creating trading rule: ${error.message}`);
    }
}

export const getAutonomousTradingRuleDetails = (currentUser: string) => 

    `Hi There!  
I can help you easily set up copy trade automations — so you never miss that alpha. Here are some examples of automations I can currently do:
 
### **1) Buy when someone else buys**
- If **@[betashop.eth|M4]** and **@[jessepollak|M1245]** buys a token, then buy me **$100** of it.
- If **@[betashop.eth|M4]**, **@[jessepollak|M1245]**, and **@[maretus|M7164]** all buy the same token within an hour of each other, then buy me **$100** of it.  

  *(Use @name for anyone whose coins you own on Moxie.)*

### **2) Buy when people in a group buy**
- If **3 people** in my **#copytrade** group buy the same token within an hour of each other, then buy me **$100** of it.

### **3) Buy then take profits**
- If **3 people** in my **#copytrade** group buy the same token within an hour of each other, then buy me **$100** of it, and then **sell if the price increases by 50%**.

---

Go to **Groups** to set up your **#copytrade** group.  
Then just use **#copytrade** as a reference in your automation.

Copy and edit the prompts above or start with one of the templates below — just tweak it to fit your strategy!
`;
