import { IAgentRuntime, Memory, State, HandlerCallback, elizaLogger, ModelClass, composeContext, generateObjectDeprecated, streamText, ModelProviderName } from "@moxie-protocol/core";
import { extractWalletTemplate, pnlTemplate } from "../template";
import { fetchPnlData, fetchTotalPnl, preparePnlQuery } from "../service/pnlService";
import { MoxieUser, moxieUserService } from "@moxie-protocol/moxie-agent-lib";
import { ethers } from "ethers";
import * as agentLib from "@moxie-protocol/moxie-agent-lib";

export const PnLAction = {
    name: "PROFIT_LOSS",
    description: "PROFIT_LOSS: This action can summarize Profit & Loss for a user (can be invoked by simply saying 'my pnl'), wallet address, token address, or senpi agent. It shows the money earned or lost by the specified entity.",
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
            let start =  new Date();
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
            elizaLogger.debug(traceId, `[PnLAction] time taken to extract wallet addresses: ${new Date().getTime() - start.getTime()}ms`);
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

            let pnlStart = new Date();
            const pnlQuery = preparePnlQuery(pnlResponse);

            const [pnlData, totalPnl] = await Promise.all([
                fetchPnlData(pnlQuery),
                (moxieUserIds.length > 0 || walletAddresses.length > 0) ? fetchTotalPnl(pnlResponse) : Promise.resolve(0)
            ]);

            elizaLogger.debug(traceId, `[PnLAction] pnlData: ${JSON.stringify(pnlData)}`);
            elizaLogger.debug(traceId, `[PnLAction] totalPnl: ${totalPnl}`);
            if (tokenAddresses.length > 0 || moxieUserIds.length > 0) {
                try {
                    const uniqueMoxieUserIds = [...new Set(pnlData.map(data => data.moxie_user_id).filter(Boolean))];
                    const userNames = await moxieUserService.getUserByMoxieIdMultiple(uniqueMoxieUserIds);
                    elizaLogger.debug(traceId, `[PnLAction] Fetched user names: ${JSON.stringify(userNames)}`);

                    // Replace moxieUserIds in pnlData with formatted userNames
                    pnlData.forEach((data) => {
                        if (data.moxie_user_id) {
                            const userName = userNames.get(data.moxie_user_id)?.userName;
                            if (/^0x[a-fA-F0-9]{40}$/.test(data.moxie_user_id)) {
                                const formattedId = `${data.moxie_user_id.slice(0, 5)}...${data.moxie_user_id.slice(-3)}`;
                                data.moxie_user_id = `@[${formattedId}|${formattedId}]`;
                            } else {
                                data.moxie_user_id = userName
                                    ? `@[${userName}|${data.moxie_user_id}]`
                                    : `@[${data.moxie_user_id}|${data.moxie_user_id}]`;
                            }
                        }
                    });
                } catch (error) {
                    elizaLogger.error(traceId, `[PnLAction] Error fetching user names for Moxie IDs: ${error.message}`);
                }
            }
            let pnlDataTemplate = pnlTemplate.replace("{{latestMessage}}", latestMessage)
                .replace("{{conversation}}", JSON.stringify(message.content.text))
                .replace("{{criteria}}", JSON.stringify(pnlResponse.criteria))
                .replace("{{pnlData}}", JSON.stringify(pnlData))
                .replace("{{totalPnl}}", (moxieUserIds.length > 0 || walletAddresses.length > 0) && totalPnl !== null ? totalPnl.toString() : "0");

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
            elizaLogger.debug(traceId, `[PnLAction] time taken to generate pnl data template: ${new Date().getTime() - pnlStart.getTime()}ms`);
            for await (const textPart of response) {
                callback({ text: textPart, action: "PROFIT_LOSS" });
            }

            return true;
        } catch (error) {
            elizaLogger.error(traceId, `[PnLAction] Error fetching PnL data: ${error}`);
            await callback?.({
                text: `Error fetching PnL data, please try again later`
            });
            return true;
        }
    }
};


/**
 * Checks if an address is an ENS name and resolves it, with caching to avoid repeated RPC calls.
 * The cache is cleared after a couple of hours to manage memory usage.
 * @param address - The address or ENS name to check and resolve
 * @returns The resolved address and ENS details if applicable
 */

const ensCache = new Map<string, { isENS: boolean, resolvedAddress: string | null, timestamp: number }>();
const CACHE_EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

async function resolveENSAddress(context: any, ensName: string) {
    let start = new Date();
    elizaLogger.debug(context, `[PnLAction] [resolveENSAddress] Checking address: ${ensName}`);

    const currentTime = Date.now();

    // Check cache first and clear expired entries
    if (ensCache.has(ensName)) {
        const cachedEntry = ensCache.get(ensName);
        if (currentTime - cachedEntry.timestamp < CACHE_EXPIRY_TIME) {
            elizaLogger.debug(context, `[PnLAction] [resolveENSAddress] Cache hit for address: ${ensName}`);
            elizaLogger.debug(context, `[PnLAction] [resolveENSAddress] Time taken to resolve ENS address: ${new Date().getTime() - start.getTime()}ms`);
            return { isENS: cachedEntry.isENS, resolvedAddress: cachedEntry.resolvedAddress };
        } else {
            ensCache.delete(ensName);
        }
    }

    let response = {
        isENS: false,
        resolvedAddress: null,
    };

    try {
        // Check if the address ends with .eth
        const isENS = ensName.toLowerCase().endsWith('.eth');

        if (!isENS) {
            return response;
        }

        const provider = new ethers.JsonRpcProvider(process.env.ETH_MAINNET_RPC_URL);

        // Try to resolve ENS name with retries and backoff
        let retries = 5;
        let delay = 1000; // Start with 1 second delay

        while (retries > 0) {
            try {
                const resolvedAddress = await provider.resolveName(ensName);

                if (resolvedAddress) {
                    response.isENS = true;
                    response.resolvedAddress = resolvedAddress;
                    // Cache the result with a timestamp
                    ensCache.set(ensName, { ...response, timestamp: currentTime });
                    elizaLogger.debug(context, `[PnLAction] [resolveENSAddress] Time taken to resolve ENS address: ${new Date().getTime() - start.getTime()}ms`);
                    return response;
                }

                // If no address resolved, try again after delay
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Double the delay for next retry
                retries--;

            } catch (error) {
                elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Attempt ${6-retries}/ 5 failed to resolve ENS name: ${ensName}`);
                if (retries === 1) {
                    return response;
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                retries--;
            }
        }

        elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Unable to resolve ENS name after retries: ${ensName}`);
        return response;

    } catch (error) {
        elizaLogger.error(context.traceId, `[PnLAction] [resolveENSAddress] Error resolving ENS: ${error}`);
        return response;
    }
}
