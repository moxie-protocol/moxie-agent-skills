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
import {
    FarcasterMetadata,
    MoxieUser,
    TwitterMetadata,
} from "@moxie-protocol/moxie-agent-lib";
import { getStakingOptions } from "../utils/degenfansApi";
import { z } from "zod";
export const stakingConsultantAction: Action = {
    name: "GET_ALFAFRENS_STAKING_RECOMENDATION",
    similes: ["VIEW_ALFAFRENS_STAKING_RECOMENDATION"],
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
            elizaLogger.log(
                "Starting GET_ALFAFRENS_STAKING_RECOMENDATION handler..."
            );

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const moxieUserInfo: MoxieUser = state.moxieUserInfo as MoxieUser;

            elizaLogger.log("moxieUserInfo", moxieUserInfo);

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
            const { userAddress, amount, mysubs, mystake, minsubs } =
                transferDetails.object as {
                    amount: number;
                    userAddress: string;
                    mysubs: boolean;
                    mystake: boolean;
                    minsubs: number;
                };

            let fid: string = null;
            let xhandle: string = null;
            const fcId = moxieUserInfo.identities.find(
                (o) => o.type === "FARCASTER"
            );
            if (fcId) {
                fid = (fcId.metadata as FarcasterMetadata).profileTokenId;
            }

            const xId = moxieUserInfo.identities.find(
                (o) => o.type === "TWITTER"
            );
            if (xId) {
                xhandle = (fcId.metadata as TwitterMetadata).username;
            }

            const stakingData: Staking = {
                amount: amount,
                userAddress: userAddress,
                mysubs: mysubs,
                mystake: mystake,
                minsubs: minsubs,
            };
            const resp = await getStakingOptions(fid, xhandle, stakingData);
            let tbl: string = "";
            elizaLogger.log("resp", resp);
            if (resp.status == 200) {
                tbl += "\n";
                if (
                    resp.data &&
                    resp.data.stakingOptions &&
                    resp.data.stakingOptions.length > 0
                ) {
                    tbl +=
                        "|rank|AlfaFrens Channel|ROI Spark/mo|current stake|\n";
                    tbl += "|------:|:--------|----:|------|\n";
                    resp.data.stakingOptions.forEach((e) => {
                        tbl +=
                            "|#" +
                            e.rank +
                            "|[" +
                            e.name +
                            "|https://alfafrens.com/channel/" +
                            e.channelAddress +
                            "]|" +
                            e.roi +
                            "|" +
                            e.currentStake +
                            "|\n";
                    });
                } else {
                    tbl += "no staking options found";
                }

                if (resp.data.amountRandom) {
                    tbl +=
                        "\n* you can also specify a staking amount to get a more precise result, e.g. 15000 AF";
                }

                if (resp.data.matchType) {
                    if (resp.data.matchType === "BY_CREATOR_COIN") {
                        tbl +=
                            "\n* I matched your AlfaFrens user by your moxie creator coin FID";
                    } else if (resp.data.matchType === "BY_GIVEN_ADDRESS") {
                        tbl +=
                            "\n* I matched your AlfaFrens user by your given AlfaFrens user address";
                    } else if (resp.data.matchType === "BY_GIVEN_NAME") {
                        tbl +=
                            "\n* I matched your AlfaFrens user by your given AlfaFrens user name";
                    } else if (resp.data.matchType === "BY_FID") {
                        tbl +=
                            "\n* I matched your AlfaFrens user by your moxie account FID";
                    } else if (resp.data.matchType === "BY_TWITTER") {
                        tbl +=
                            "\n* I matched your AlfaFrens user by your moxie account X handle";
                    }
                } else {
                    tbl +=
                        "\n* I was not able to match your AlfaFrens profile, following options you have:";
                    tbl += "\n   * AlfaFrens profile address";
                    tbl += "\n   * AlfaFrens profile name";
                    tbl +=
                        "\n   * conected Farcaster Account from your Moxie profile";
                    tbl += "\n   * conected X Account from your Moxie profile";
                    tbl += "\n";
                    tbl +=
                        "\nif you don´t have any account on AlfaFrens, create one on:";
                    tbl += "\nhttps://alfafrens.com";
                    tbl +=
                        "\n\nElse, get in touch w/ @degenfans to resolve the issue";
                }

                tbl = resp.message + tbl;
            } else {
                tbl = "degenfans server is not reachable, try again later!";
            }
            await callback?.({
                text: tbl,
            });
        } catch (err) {
            elizaLogger.error(
                "Error in GET_ALFAFRENS_STAKING_RECOMENDATION",
                err
            );
            let errorText = "";
            if (err instanceof z.ZodError) {
                errorText = "following error occured:";
                err.errors.forEach((err2) => {
                    errorText += "\n" + err2.message;
                });
                errorText += "\n\n";
            }
            await callback?.({
                text:
                    errorText +
                    "also make sure, that you have an AlfaFrens account:\nhttps://alfafrens.com\n\nif you still face some issues, please contact @degenfans",
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
