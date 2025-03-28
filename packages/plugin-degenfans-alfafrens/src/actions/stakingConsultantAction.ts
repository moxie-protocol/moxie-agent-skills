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
import { Staking, StakingSchema } from "../types";
import { FarcasterMetadata, ftaService, MoxieUser, TwitterMetadata } from "@moxie-protocol/moxie-agent-lib";
import { getHelpText, getHelpTextUserNotFound, getStakingOptions, getUserData, StakingRequest } from "../utils/degenfansApi";
import { z } from 'zod';
export const stakingConsultantAction: Action = {
    name: "GET_ALFAFRENS_STAKING_RECOMMENDATION",
    similes: [
        "VIEW_ALFAFRENS_STAKING_RECOMMENDATION",
        "GIVE_ALFAFRENS_STAKING_RECOMMENDATION",
        "GET_ALFAFRENS_STAKING_CONSULTANT",
        "STAKING_RECOMMENDATION_ON_ALFAFRENS",
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
        try {
            elizaLogger.log("Starting GET_ALFAFRENS_STAKING_RECOMENDATION handler...");

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;

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
                mystake,
                minsubs,
            } = transferDetails.object as {
                amount: number;
                userAddress: string;
                mysubs: boolean;
                mystake: boolean;
                minsubs: number;
            };

            const userData = getUserData(moxieUserInfo);

            const stakingData: StakingRequest = { amount: amount, mysubs: mysubs, mystake: mystake, minsubs: minsubs };
            const resp = await getStakingOptions(userData, userAddress, stakingData);
            let tbl: string = "";
            
            if (resp.status == 200) {

                if(!resp.data.user){
                    tbl += getHelpTextUserNotFound();
                }
                tbl + resp.message;
                tbl += "\n";
                if (resp.data && resp.data.result && resp.data.result.stakingOptions && resp.data.result.stakingOptions.length > 0) {
                    tbl += "|rank|AlfaFrens Channel|ROI Spark/mo|current stake|\n";
                    tbl += "|------:|:--------|----:|------|\n";
                    resp.data.result.stakingOptions.forEach(e => {
                        tbl += "|#" + e.rank + "|[" + e.name + "](https://alfafrens.com/channel/" + e.channelAddress + ")|" + e.roi + "|" + e.currentStake + "|\n";
                    });
                } else {
                    tbl += "no staking options found";
                }

                if (resp.data.result.amountRandom) {
                    tbl += "\n* you can also specify a staking amount to get a more precise result, e.g. 15000 AF"
                }
                tbl += getHelpText(resp.data.user);


                tbl =  tbl;
            } else {
                tbl = "degenfans server is not reachable, try again later!";
            }
            await callback?.({
                text: tbl,
            });
        } catch (err) {
            let errorText = "";
            if (err instanceof z.ZodError) {
                errorText = "following error occured:"
                err.errors.forEach((err2) => {
                    errorText += "\n" + err2.message;
                });
                errorText += "\n\n";
            }
            await callback?.({
                text: errorText + "also make sure, that you have an AlfaFrens account:\nhttps://alfafrens.com\n\nif you still face some issues, please contact @degenfans",
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I (0x114B242D931B47D5cDcEe7AF065856f70ee278C4) want to stake 50000 AF",
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
