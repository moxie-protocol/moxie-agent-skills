import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
    type ActionExample,
    composeContext,
    generateObject,
    ModelClass,
} from "@moxie-protocol/core";

import { stakingConsultantTemplate } from "../templates";
import { StakingSchema } from "../types";

export const stakingConsultantAction: Action = {
    name: "GET_ALFAFRENS_STAKING_RECOMENDATION",
    similes: [
        "VIEW_ALFAFRENS_STAKING_RECOMENDATION"
    ],
    description: "get recomendation for AlfaFrens stakings",
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        
          elizaLogger.log("Starting TRANSFER_BASE_ETH handler...");
        
                    // Initialize or update state
                    if (!state) {
                        state = (await runtime.composeState(message)) as State;
                    } else {
                        state = await runtime.updateRecentMessageState(state);
                    }
        
                    const context = composeContext({
                        state,
                        template: stakingConsultantTemplate,
                    });
        
                    const transferDetails = await generateObject({
                        runtime,
                        context,
                        modelClass: ModelClass.SMALL,
                        schema: StakingSchema,
                    });
                    let {
                        userAddress,
                        amount,
                        mysubs,
                        mytake,
                    } = transferDetails.object as {
                            amount: number;
                            userAddress:string;
                            mysubs: boolean;
                            mytake: boolean;
                    };
        await callback?.({
            text: `The staking amount is ${amount} AF.`,
        });
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you check my token balance on Base?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "The balance of your agent wallet is 0.01 ETH",
                    action: "GET_ALFAFRENS_STAKING_RECOMENDATION",
                },
            },
        ],
    ] as ActionExample[][],
};
