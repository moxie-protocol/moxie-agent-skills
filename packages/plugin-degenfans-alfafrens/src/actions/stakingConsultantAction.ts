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
import { getStakingOptions } from "../utils/degenfansApi";
import { checkDegenFansCoins } from "../utils/moxieSubgraphApi";

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
        
              let fid:number=null;
              let xhandle:string=null;
              const fcId = moxieUserInfo.identities.find(o=>o.type==='FARCASTER');
              if(fcId){
                fid=(fcId.metadata as FarcasterMetadata).profileTokenId;
              }

              const xId = moxieUserInfo.identities.find(o=>o.type==='TWITTER');
              if(xId){
                xhandle=(fcId.metadata as TwitterMetadata).username;
              }
                    
              const stakingData:Staking = {amount:amount,userAddress:userAddress,mysubs:mysubs,mystake:mystake,minsubs:minsubs};
              const resp =   await  getStakingOptions(fid,xhandle, stakingData);  
              let tbl:string="";
              if(resp.status==200){
                tbl+="\n";
                if(resp.data && resp.data.length > 0){
                    tbl+="|rank|AlfaFrens Channel|ROI Spark/mo|current stake|\n";
                    tbl+="|------:|:--------|----:|------|\n";
                    resp.data.forEach(e=>{
                        tbl+="|#"+e.rank+"|["+e.name+"|https://alfafrens.com/channel/"+e.channelAddress+"]|"+e.roi+"|"+e.currentStake+"|\n";
                    });
                }else{
                    tbl+="no staking options found";
                }
            }
        await callback?.({
            text: resp.message+tbl,
        });
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
