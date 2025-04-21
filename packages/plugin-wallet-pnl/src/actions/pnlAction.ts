import { IAgentRuntime, Memory, State, HandlerCallback, elizaLogger, ModelClass, composeContext, generateObjectDeprecated, streamText, ModelProviderName } from "@moxie-protocol/core";
import { extractWalletTemplate, walletPnLTemplate } from "../template";
import { fetchPnlData, preparePnlQuery } from "../service/pnlService";
import { MoxieClientWallet, MoxieUser } from "@moxie-protocol/moxie-agent-lib";
import { delegateAccessNotFound } from "../utils";
import { agentWalletNotFound } from "../utils";

export const walletPnlAction = {
    name: "WALLET_PnL",
    description: "This action handles the calculation of the PnL of a wallet.",
    suppressInitialMessage: true,
    examples: [],
    similes: ["PNL", "PNL_DATA", "WALLET_PnL"],
    validate: async function (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<boolean> {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory, 
        state: State,
        options: any,
        callback?: HandlerCallback
    ) => {
        const traceId = message.id;
        const moxieUserInfo = state.moxieUserInfo as MoxieUser;
        const moxieUserId = moxieUserInfo.id;
        
        try {
            elizaLogger.debug(traceId, `[WalletPnlAction] [${moxieUserId}] Starting Wallet PnL calculation`);
            
            elizaLogger.debug(traceId, `[WalletPnlAction] [${moxieUserId}] message context text: ${message.content.text}`);

            const latestMessage = message.content.text;

            const walletPnlTemplateWithLatestMessage = extractWalletTemplate
                .replace("{{latestMessage}}", latestMessage)
                .replace("{{conversation}}", "")
                .replace("{{moxieUserId}}", moxieUserId);

            const walletPnlContext = composeContext({
                state,
                template: walletPnlTemplateWithLatestMessage,
            });

            const walletPnlResponse = await generateObjectDeprecated({
                runtime,
                context: walletPnlContext,
                modelClass: ModelClass.SMALL,
            });

            elizaLogger.debug(traceId, `[WalletPnlAction] walletPnlResponse: ${JSON.stringify(walletPnlResponse)}`);

            // TODO: Fetch PnL data from Dune DB
            // use dune table called result_wallet_pnl to get the PnL data
            const pnlQuery = await preparePnlQuery(walletPnlResponse);

            const pnlData = await fetchPnlData(pnlQuery);

            elizaLogger.debug(traceId, `[WalletPnlAction] pnlData: ${pnlData}`);

            // TODO: use the template to replace the pnlData
            const pnlDataTemplate = walletPnLTemplate.replace("{{pnlData}}", JSON.stringify(pnlData));

            const currentContext = composeContext({
                state,
                template: pnlDataTemplate,
            });

            const response = await streamText({
                runtime,
                context: currentContext,
                modelClass: ModelClass.MEDIUM,
                modelConfigOptions: {
                    modelProvider: ModelProviderName.OPENAI,
                    temperature: 0.5,
                    apiKey: process.env.OPENAI_API_KEY!,
                    modelClass: ModelClass.MEDIUM
                }
            });

            for await (const textPart of response) {
                callback({ text: textPart, action: "WALLET_PnL" });
            }
            
            return true;
        } catch (error) {
            await callback?.({
                text: `Error fetching PnL data: ${error.message}`
            });
            return true;
        }
    }
};