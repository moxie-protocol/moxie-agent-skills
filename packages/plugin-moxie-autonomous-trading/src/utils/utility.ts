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
    
    // Validate that at least one of groupTradeParams or userTradeParams exists
    if (ruleTrigger === 'GROUP' && !groupTradeParams) {
        throw new Error('groupTradeParams must be provided when ruleTriggers is GROUP');
    }
    if (ruleTrigger === 'USER' && !userTradeParams) {
        throw new Error('userTradeParams must be provided when ruleTriggers is USER'); 
    }

    if(groupTradeParams && userTradeParams) {
        throw new Error('Only one of groupTradeParams or userTradeParams can be provided');
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
        throw new Error(`Error creating trading rule: ${error.message}`);
    }
}

export const getAutonomousTradingRuleDetails = (currentUser: string) => 

    `Hi ${currentUser}!  
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
