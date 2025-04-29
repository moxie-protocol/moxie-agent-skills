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
} from "@senpi-ai/core";

import { gasUsageTemplate, stakingConsultantTemplate } from "../templates";
import { GasUsageSchema, Staking, StakingSchema } from "../types";
import {
    FarcasterMetadata,
    ftaService,
    SenpiUser,
    TwitterMetadata,
} from "@senpi-ai/senpi-agent-lib";
import {
    getGasUsgae,
    getHelpText,
    getStakingOptions,
    getUserData,
    StakingRequest,
} from "../utils/degenfansApi";
import { z } from "zod";
export const gasUsageAction: Action = {
    name: "GET_ALFAFRENS_GAS_USAGE",
    similes: ["VIEW_ALFAFRENS_GAS_USAGE"],
    description: "get gas usage for an AlfaFrens profile",
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
            elizaLogger.log("Starting GET_ALFAFRENS_GAS_USAGE handler...");

            // Initialize or update state
            if (!state) {
                state = (await runtime.composeState(message)) as State;
            } else {
                state = await runtime.updateRecentMessageState(state);
            }

            const senpiUserInfo: SenpiUser = state.senpiUserInfo as SenpiUser;

            const context = composeContext({
                state,
                template: gasUsageTemplate,
            });

            const transferDetails = await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
                schema: GasUsageSchema,
            });
            let { userAddress } = transferDetails.object as {
                userAddress: string;
            };

            const userData = getUserData(senpiUserInfo);

            const resp = await getGasUsgae(userData, userAddress);
            let tbl: string = "";
            console.log(resp);
            if (resp.status == 200) {
                if (resp.data.result.image) {
                    tbl +=
                        "\n![gas usage image](" + resp.data.result.image + ")";
                }
                tbl += "\n";

                tbl += getHelpText(resp.data.user);

                tbl = resp.message + tbl;
            } else {
                tbl = "degenfans server is not reachable, try again later!";
            }
            await callback?.({
                text: tbl,
            });
        } catch (err) {
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
                    text: "give me gas usage informations for the user 0x114B242D931B47D5cDcEe7AF065856f70ee278C4",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Hi Degenfans,\n![gas usage image](imageUrl)",
                    action: "GET_ALFAFRENS_GAS_USAGE",
                },
            },
        ],
    ] as ActionExample[][],
};
