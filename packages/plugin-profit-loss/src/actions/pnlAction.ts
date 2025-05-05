import { IAgentRuntime, Memory, State, HandlerCallback, elizaLogger, ModelClass, composeContext, generateObjectDeprecated, streamText, ModelProviderName } from "@moxie-protocol/core";
import { extractWalletTemplate, pnLTemplate } from "../template";
import { fetchPnlData, fetchTotalPnl, preparePnlQuery } from "../service/pnlService";
import { getERC20TokenSymbol, MoxieUser } from "@moxie-protocol/moxie-agent-lib";
import { ethers } from "ethers";
import * as agentLib from "@moxie-protocol/moxie-agent-lib";

export const PnLAction = {
    name: "PROFIT_LOSS",
    description: "This action can summarize Profit & Loss for a user, wallet address, or token address. It shows the money earned or lost by the specified entity.",
    suppressInitialMessage: true,
    examples: [],
    similes: ["PNL", "PNL_DATA", "PROFIT_LOSS", "PROFIT_LOSS_DATA", "USER_PnL", "WALLET_PnL", "TOKEN_PnL"],
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
        const agentWallet = state.agentWallet as agentLib.MoxieClientWallet;
        const agentWalletAddress = agentWallet.address.toLowerCase();
        try {
            elizaLogger.debug(traceId, `[PnLAction] [${moxieUserId}] Starting PnL calculation`);

            const latestMessage = message.content.text;

            const context = composeContext({
                state: {
                    ...state,
                    latestMessage: latestMessage,
                    moxieUserId,
                    agentWalletAddress: agentWalletAddress,
                },
                template: extractWalletTemplate,
            });

            const pnlResponse = await generateObjectDeprecated({
                runtime,
                context: context,
                modelClass: ModelClass.SMALL,
            });

            elizaLogger.debug(traceId, `[PnLAction] walletPnlResponse: ${JSON.stringify(pnlResponse)}`);

            const criteria = Array.isArray(pnlResponse.criteria) ? pnlResponse.criteria : [];
            const { analysisType, maxResults, chain } = pnlResponse;
            // const { tokenAddresses, walletAddresses } = await categorizeAddressesIntoTokensAndWallets(pnlResponse, context, traceId);
            const tokenAddresses: string[] = [];
            const walletAddresses: string[] = [];
            const moxieUserIds: string[] = [];
            for (const criterion of criteria) {
                if (criterion.TYPE === "tokenAddress") {
                    tokenAddresses.push(criterion.VALUE);
                } else if (criterion.TYPE === "wallet") {
                    walletAddresses.push(criterion.VALUE);
                } else if (criterion.TYPE === "ens") {
                    const resolvedAddress = await resolveENSAddress(context, criterion.VALUE);
                    if (resolvedAddress.isENS) {
                        walletAddresses.push(resolvedAddress.resolvedAddress);
                    } else {
                        walletAddresses.push(criterion.VALUE);
                    }
                } else if (criterion.TYPE === "moxieUserId") {
                    moxieUserIds.push(criterion.VALUE);
                }
            }
            //TODO: handle -ve case if nothing is given in input
            if (tokenAddresses.length === 0 && walletAddresses.length === 0 && moxieUserIds.length === 0) {
                elizaLogger.error(traceId, `[PnLAction] No valid criteria provided. Please provide at least one token address, wallet address, or Moxie user ID.`);
                await callback?.({
                    text: `Please provide at least one token address, wallet address, or Moxie user ID.`
                });
                return true;
            }


            pnlResponse.tokenAddresses = tokenAddresses;
            pnlResponse.walletAddresses = walletAddresses;
            pnlResponse.moxieUserIds = moxieUserIds;

            elizaLogger.debug(traceId, `[PnLAction] categorized token addresses: ${JSON.stringify(tokenAddresses)}`);
            elizaLogger.debug(traceId, `[PnLAction] categorized wallet addresses: ${JSON.stringify(walletAddresses)}`);
            elizaLogger.debug(traceId, `[PnLAction] agent wallet address: ${agentWalletAddress}`);

            // use dune table called result_wallet_pnl to get the PnL data
            const pnlQuery = preparePnlQuery(pnlResponse);

            const [pnlData, totalPnl] = await Promise.all([
                fetchPnlData(pnlQuery),
                (moxieUserIds.length > 0 || walletAddresses.length > 0) ? fetchTotalPnl(pnlResponse) : Promise.resolve(0)
            ]);

            elizaLogger.debug(traceId, `[PnLAction] pnlData: ${JSON.stringify(pnlData)}`);
            elizaLogger.debug(traceId, `[PnLAction] totalPnl: ${totalPnl}`);

            let pnlDataTemplate = pnLTemplate.replace("{{latestMessage}}", latestMessage)
                .replace("{{conversation}}", JSON.stringify(message.content.text))
                .replace("{{pnlData}}", JSON.stringify(pnlData))
                .replace("{{totalPnl}}", (moxieUserIds.length > 0 || walletAddresses.length > 0) ? totalPnl.toString() : "");

            const currentContext = composeContext({
                state,
                template: pnlDataTemplate,
            });

            const response = streamText({
                runtime,
                context: currentContext,
                modelClass: ModelClass.MEDIUM,
                modelConfigOptions: {
                    modelProvider: ModelProviderName.OPENAI,
                    temperature: 0.0,
                    apiKey: process.env.OPENAI_API_KEY!,
                    modelClass: ModelClass.MEDIUM
                }
            });

            for await (const textPart of response) {
                callback({ text: textPart, action: "PROFIT_LOSS" });
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


/**
 * Checks if an address is an ENS name and resolves it
 * @param address - The address or ENS name to check and resolve
 * @returns The resolved address and ENS details if applicable
 */
async function resolveENSAddress(context: any, address: string) {
    elizaLogger.debug(context, `[PnLAction] [resolveENSAddress] Checking address: ${address}`);

    let response = {
        isENS: false,
        resolvedAddress: null,
    };

    try {
        // Check if the address ends with .eth
        const isENS = address.toLowerCase().endsWith('.eth');

        if (!isENS) {
            return response;
        }

        const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC_URL);

        // Try to resolve ENS name with retries and backoff
        let retries = 5;
        let delay = 1000; // Start with 1 second delay

        while (retries > 0) {
            try {
                const resolvedAddress = await provider.resolveName(address);

                if (resolvedAddress) {
                    response.isENS = true;
                    response.resolvedAddress = resolvedAddress;
                    return response;
                }

                // If no address resolved, try again after delay
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
                retries--;

            } catch (error) {
                elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Attempt ${6-retries}/ 5 failed to resolve ENS name: ${address}`);
                if (retries === 1) {
                    return response;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                retries--;
            }
        }

        elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Unable to resolve ENS name after retries: ${address}`);
        return response;

    } catch (error) {
        elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Error resolving ENS: ${error}`);
        return response;
    }
}

async function categorizeAddressesIntoTokensAndWallets(walletPnlResponse: any, context: any, traceId: string) {
    const tokenAddresses: string[] = [];
    const walletAddresses: string[] = [];

    const addresses = walletPnlResponse.criteria.map((c: any) => c.VALUE);
    for (const address of addresses) {
        if (address.toLowerCase().endsWith('.eth')) {
            // resolve the ENS address
            const resolvedAddress = await resolveENSAddress(context, address);
            if (resolvedAddress.isENS) {
                walletAddresses.push(resolvedAddress.resolvedAddress);
                continue;
            } else {
                walletAddresses.push(address);
            }
        }

        if (!ethers.isAddress(address)) {
            elizaLogger.debug(traceId, `[PnLAction] Invalid address format: ${address}`);
            continue;
        }

        try {
            // Try to get token symbol - if successful, it's likely a token contract
            const tokenSymbol = await getERC20TokenSymbol(address);
            if (tokenSymbol) {
                // Address has contract code - likely a token
                tokenAddresses.push(address.toLowerCase());
            } else {
                // Address has no contract code - likely a wallet
                walletAddresses.push(address.toLowerCase());
            }
        } catch (error) {
            elizaLogger.error(traceId, `[PnLAction] Error checking address ${address}: ${error}`);
            continue;
        }
    }

    return { tokenAddresses, walletAddresses };
};