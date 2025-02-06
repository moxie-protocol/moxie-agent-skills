import {
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    ModelClass,
    type IAgentRuntime,
    type Memory,
    type State
} from "@elizaos/core";
import { swapTemplate } from "../templates";
import { ftaService, MoxieUser } from "@elizaos/moxie-lib";
import { calculateTokensBuy } from "../utils/calculateTokensForBuy";
import {
    creatorCoinSwapTemplate,
} from "../templates/creatorCoinSwapTemplate";
import { decodeMoxieTokenTransfer, getERC20Balance, getERC20Decimals, getNativeTokenBalance } from "../utils/erc20Balance";
import { EthereumSendTransactionResponseType, EthereumSignTypedDataResponseType, Hex, Wallet } from "@privy-io/server-auth";
import { executeBuyAction, privy } from "../utils/swapCreatorCoins";
import { concat, ethers, parseEther } from "ethers";
import { execute0xSwap, get0xPrice, get0xSwapQuote } from "../utils/0xApis";
import { checkMoxieBalance, convert32BytesToAddress, convertAddress, extractCreatorDetails, extractTokenDetails, handleTransactionStatus } from "../utils/common";
import { GetQuoteResponse } from "../types";
import { checkAllowanceAndApproveSpendRequest } from "../utils/checkAndApproveTransaction";
import { numberToHex, size } from "viem";
import { creatorCoinSwapExamples } from "./examples";
import { MOXIE_TOKEN_ADDRESS, MOXIE_TOKEN_DECIMALS, USDC, USDC_ADDRESS, USDC_TOKEN_DECIMALS } from "../utils/constants";

export { swapTemplate };

export const creatorCoinSwapAction = {
    suppressInitialMessage: true,
    name: "SWAP_CREATOR_COINS",
    description: "This action handles all creator coin transactions , setting specific allocation ratios (e.g. 30-70 split), bulk token purchases using @ mentions, and general buying/selling/swapping of creator coins. Use for any message containing purchase amounts ($10, etc) with coin symbols or @ mentions.",
    handler: async (
        runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options: any,
        callback?: any,
    ) => {
        // pick moxie user info from state
        const moxieUserInfo = state.moxieUserInfo as MoxieUser;
        const moxieUserId = moxieUserInfo.id;
        try {
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Starting creatorCoinSwap handler with user message: ${JSON.stringify(_message, (key, value) => key === 'embedding' ? undefined : value)}`);

            // Compose swap context
            const swapContext = composeContext({
                state,
                template: creatorCoinSwapTemplate,
            });

            // Generate swap content
            const swapOptions = await generateObjectDeprecated({
                runtime,
                context: swapContext,
                modelClass: ModelClass.MEDIUM,
            }) as CreatorCoinSwapResponse;
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] swapOptions: ${JSON.stringify(swapOptions)}`);

            // check if confirmation is required
            if (swapOptions.confirmation_required) {
                await callback?.({
                    text: swapOptions.confirmation_message,
                    content: {
                        confirmation_required: true,
                        action: "SWAP_CREATOR_COINS",
                        inReplyTo: _message.id
                    }
                });
                return true;
            }

            // check if there is any error in the swapOptions
            if (swapOptions.error) {
                await callback?.({
                    text: swapOptions.error.prompt_message,
                    content: {
                        error: swapOptions.error.missing_fields,
                        action: "SWAP_CREATOR_COINS",
                        inReplyTo: _message.id
                    }
                });
                return true;
            }

            // Validate swap content
            if (!isValidSwapContent(moxieUserId, swapOptions, callback)) {
                elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] swapOptions is not valid: ${JSON.stringify(swapOptions)}`);
                return true;
            }

            // read moxieUserInfo from state
            const agentWallet = state.agentWallet as Wallet;

            if (!agentWallet) {
                await callback?.({
                    text: `Unable to access wallet details. Please ensure your agent wallet is properly setup and try again.`,
                    content: {
                        error: "AGENT_WALLET_NOT_FOUND",
                        details: `Agent wallet details are not available for the user`
                    }
                });
                return true;
            }

            if (!agentWallet.delegated) {
                await callback?.({
                    text: `Your agent wallet requires delegate access to perform this action. Please contact support if this issue persists.`,
                    content: {
                        error: "DELEGATE_ACCESS_NOT_FOUND",
                        details: `Delegate access is not present on user's agent wallet`
                    }
                });
                return true;
            }

            // process each transaction
            for (const transaction of swapOptions.transactions) {
                // retrieve transaction elements
                const { sellQuantity, buyQuantity, sellToken , buyToken , value_type, balance } = transaction;
                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] transaction elements - sellQuantity: ${sellQuantity}, buyQuantity: ${buyQuantity}, sellToken: ${sellToken}, buyToken: ${buyToken}, value_type: ${value_type}, balance: ${JSON.stringify(balance)}`);

                // extract token details
                // const { tokenSymbol: buyTokenSymbol, tokenAddress: buyTokenAddress } = extractTokenDetails(buyToken);

                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] transaction action: ${swapOptions.action}`);
                if (swapOptions.action == "BUY" || swapOptions.action == "SWAP") {

                    const { tokenSymbol: sellTokenSymbol, tokenAddress: sellTokenAddress } = extractTokenDetails(sellToken);

                    if (!sellTokenSymbol || !sellTokenAddress) {
                        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Invalid token details: ${JSON.stringify(transaction)}`);
                        await callback?.({
                            text: "Invalid token details. Please try again with valid token details.",
                            content: { error: "INVALID_TOKEN_DETAILS" }
                        });
                    }

                     // fetch decimals for the sell Tokens. If ETH the use 18
                     const sellTokenDecimals = sellTokenSymbol === "ETH"
                        ? 18
                        : await getERC20Decimals(sellTokenAddress);


                    // Check if sell token or buy token contains creator ID
                    const {userId: sellTokenCreatorId, username: sellTokenCreatorUsername} = extractCreatorDetails(sellToken);
                    const {userId: buyTokenCreatorId, username: buyTokenCreatorUsername} = extractCreatorDetails(buyToken);

                    // if no creator ID is found in the tokens then return error
                    if (!sellTokenCreatorId && !buyTokenCreatorId) {
                        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] No creator ID found in tokens`);
                        await callback?.({
                            text: "Could not find valid creator ID in the transaction tokens. Please use format @[username|userId].",
                            content: {
                                error: "INVALID_CREATOR_ID",
                                details: "No creator ID found in transaction tokens"
                            }
                        });
                        return true;
                    }

                    if (sellTokenCreatorId == buyTokenCreatorId) {
                        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] sellTokenCreatorId and buyTokenCreatorId are the same: ${sellTokenCreatorId}`);
                        await callback?.({
                            text: "Sell and buy tokens cannot be the same. Please try again with different tokens.",
                            content: {
                                error: "INVALID_SWAP_TOKENS",
                                details: "Sell and buy tokens cannot be the same. Please try again with different tokens."
                            }
                        });
                        return true;
                    }

                    if (sellTokenCreatorId && buyTokenCreatorId) {
                        // dont allow swap between different creators
                        await callback?.({
                            text: "Swap between different creators is not supported yet. Please try again with different transaction tokens.",
                            content: {
                                error: "INVALID_SWAP_TOKENS",
                            }
                        });
                        return true;
                    }

                    // fetch the fta details of the creator
                    // Get FTA details for any creator IDs found in tokens
                    const creatorIds = [sellTokenCreatorId, buyTokenCreatorId].filter(id => id !== null);
                    let ftaResponses: { [key: string]: any } = {};
                    try {
                        ftaResponses = await getFtaResponses(creatorIds, moxieUserId, runtime, callback);
                    } catch (error) {
                        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Error getting FTA responses: ${error}`);
                        return true;
                    }

                    // get the subject address of the creator
                    // Get subject addresses for sell and buy tokens
                    //const sellTokenSubjectAddress = sellTokenCreatorId ? ftaResponses[sellTokenCreatorId].subjectAddress : null;
                    const buyTokenSubjectAddress = buyTokenCreatorId ? ftaResponses[buyTokenCreatorId].subjectAddress : null;
                    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Subject addresses buy: ${buyTokenSubjectAddress}`);

                    let provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

                    // execute swap based on transaction type
                     // set default quantity in WEI
                    let quantityInWEI: bigint;
                    let moxieInWEI: bigint;
                    let isSwapToMoxieRequired = false;
                    // check if value_type is USD

                    // if sell token is directly MOXIE then we no need to swap it. we can directly buy the tokens using MBC contract

                    // if user is asking to purchase interms of buy quantity then we need to calculate the moxie in WEI
                    if (buyQuantity) {
                        let buyQuantityInWEI =  ethers.parseUnits(buyQuantity.toString(), MOXIE_TOKEN_DECIMALS);
                        moxieInWEI = await calculateTokensBuy(moxieUserId, buyTokenSubjectAddress, buyQuantityInWEI);
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] moxie in WEI: ${moxieInWEI}`);
                        if (sellTokenSymbol == "MOXIE") {
                            quantityInWEI = moxieInWEI;
                        } else {
                            const price = await get0xPrice({
                                moxieUserId: moxieUserId,
                                sellAmountBaseUnits: moxieInWEI.toString(),
                            buyTokenAddress: sellTokenAddress,
                            walletAddress: agentWallet.address,
                            sellTokenAddress: MOXIE_TOKEN_ADDRESS,
                        });
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] price: ${price}`);
                        quantityInWEI = BigInt(price.buyAmount);
                        isSwapToMoxieRequired = true;
                        }
                    }

                    if (sellQuantity) {
                        let sellQuantityInWEI = ethers.parseUnits(sellQuantity.toString(), sellTokenDecimals);
                        if (value_type && value_type == "USD") { // value type based swap
                            sellQuantityInWEI = ethers.parseUnits(sellQuantity.toString(), USDC_TOKEN_DECIMALS);
                            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] value_type: ${value_type}`);
                            try {
                                quantityInWEI = await getTargetQuantityForSwapsWithUSDValueType(moxieUserId, sellTokenSymbol, sellTokenAddress, sellQuantityInWEI, agentWallet, callback);
                            } catch (error) {
                                elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Error getting USD value quantity: ${error}`);
                                return true;
                            }
                            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [value_type] quantityInWEI: ${quantityInWEI}`);
                        } else {
                            quantityInWEI = sellQuantityInWEI;
                        }
                        if (sellTokenSymbol != "MOXIE") {
                            isSwapToMoxieRequired = true
                        } else {
                            moxieInWEI = quantityInWEI;
                            isSwapToMoxieRequired = false
                        }
                    }

                    if (balance && balance.type) { // balance based swap
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] balance type: ${JSON.stringify(balance)}`);
                        try {
                            quantityInWEI = await getTargetQuantityForBalanceBasedSwaps(moxieUserId, sellTokenAddress, sellTokenSymbol, agentWallet, balance, callback);
                            if (sellTokenSymbol != "MOXIE") {
                                isSwapToMoxieRequired = true
                            }
                        } catch (error) {
                            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Error getting balance based quantity: ${error}`);
                            return true;
                        }
                        if (sellTokenSymbol != "MOXIE") {
                            isSwapToMoxieRequired = true
                        } else {
                            moxieInWEI = quantityInWEI;
                            isSwapToMoxieRequired = false
                        }
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [balance] quantityInWEI: ${quantityInWEI}`);
                    }

                    if (isSwapToMoxieRequired) {
                         // Case 3: All other scenarios - perform swap
                         moxieInWEI = await swapToMoxie(
                            sellTokenAddress,
                            sellTokenSymbol,
                            moxieUserId,
                            agentWallet.address,
                            quantityInWEI,
                            provider,
                            callback,
                            sellTokenDecimals
                        );
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] swapToMoxie completed, moxie in WEI: ${moxieInWEI}`);

                        // check if moxieInWEI is 0n
                        if (!moxieInWEI || moxieInWEI === 0n) {
                            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] moxieInWEI is 0n`);
                            return true;
                        }
                        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] moxie in WEI: ${moxieInWEI}`);
                    }

                    // check if user has enough moxie to complete this purchage
                    const insufficientMoxieBalance = await checkMoxieBalance(moxieInWEI, agentWallet.address, callback);
                    if (insufficientMoxieBalance) {
                        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] insufficient moxie balance`);
                        return true;
                    }

                    // callback
                    await callback?.({
                        text: `Initiating purchase of ${buyTokenCreatorUsername} creator coins for ${ethers.formatUnits(moxieInWEI.toString(), MOXIE_TOKEN_DECIMALS)} MOXIE.`,
                    });

                    // execute buy action
                    const swapResp = await executeBuyAction(moxieUserId, provider, agentWallet.address, buyTokenSubjectAddress, moxieInWEI, callback);
                    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] swap response: ${JSON.stringify(swapResp)}`);

                } else if (swapOptions.action == "SELL") {
                    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] sell action`);
                    // sell is not supported yet
                    await callback?.({
                        text: `Sell is not supported yet. Please try again later.`,
                        content: {
                            error: "SELL_NOT_SUPPORTED",
                        }
                    });
                    return true;
                }
            }
        } catch (error) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] error occured while performing swap operation: ${JSON.stringify(error)}`);
            if (error.message == 'Wallet has insufficient funds to execute the transaction (transaction amount + fees)') {
                await callback?.({
                    text: `Insufficient ETH balance to complete this transaction. Please add more ETH to your wallet to cover gas fees.`,
                    content: {
                        error: "INSUFFICIENT_ETH_BALANCE",
                        details: `Insufficient ETH balance to complete this purchase. Please topup ETH`
                    }
                });
                return true;
            }
            await callback?.({
                text: `An error occurred while performing the swap operation: ${error.message}. Please try again or contact support if the issue persists.`,
                content: {
                    error: "SWAP_OPERATION_FAILED",
                    details: `An error occurred while performing the swap operation: ${error.message}. Please try again or contact support if the issue persists.`
                }
            });
            return true;
        }
    },
    template: creatorCoinSwapTemplate,
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // if (message.content.text.toLowerCase().includes("@[")) {
        //     return true;
        // }
        // return false;
        return true;
    },
    examples: creatorCoinSwapExamples,
    similes: [
        "CREATOR_TOKEN_SWAP",
        "CREATOR_COIN_SWAP",
        "EXCHANGE_CREATOR_COINS",
        "TRADE_CREATOR_TOKENS",
        "BUY_CREATOR_TOKENS",
        "BUY_CREATOR_COINS",
        "PURCHASE_CREATOR_COINS"
    ],
};

async function isValidSwapContent(
    moxieUserId: string,
    content: CreatorCoinSwapResponse,
    callback: HandlerCallback
): Promise<boolean> {
    // Validate basic content structure
    if (!content || !content.transactions || content.transactions.length === 0) {
        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [isValidSwapContent] Invalid content structure: ${JSON.stringify(content)}`);
        await callback?.({
            text: "Invalid transaction structure. Please try again with a valid transaction request.",
            content: {
                error: "INVALID_CONTENT",
                details: "Missing or empty transactions array",
                action: "SWAP_CREATOR_COINS"
            }
        });
        return false;
    }

    // Validate each transaction
    for (const transaction of content.transactions) {
        // Check required fields
        if (!transaction.sellToken || !transaction.buyToken || (!transaction.balance && !transaction.buyQuantity && !transaction.sellQuantity)) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [isValidSwapContent] Missing required fields in transaction: ${JSON.stringify(transaction)}`);
            await callback?.({
                text: "Missing required transaction fields. Please specify quantity, sell token, and buy token.",
                content: {
                    error: "MISSING_FIELDS",
                    details: "Transaction missing required fields",
                    action: "SWAP_CREATOR_COINS",
                }
            });
            return false;
        }

        // Validate quantities are positive
        if ((transaction.sellQuantity && transaction.sellQuantity <= 0) ||
            (transaction.buyQuantity && transaction.buyQuantity <= 0)) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [isValidSwapContent] Invalid quantity: sellQuantity=${transaction.sellQuantity}, buyQuantity=${transaction.buyQuantity}`);
            await callback?.({
                text: "Transaction quantities must be greater than 0.",
                content: {
                    error: "INVALID_QUANTITY",
                    details: "Quantities must be positive",
                    action: "SWAP_CREATOR_COINS",
                }
            });
            return false;
        }

        // Validate balance fields if present
        if (transaction.balance) {
            if (!transaction.balance.source_token ||
                !transaction.balance.type ||
                (transaction.balance.type === 'PERCENTAGE' &&
                    (transaction.balance.percentage <= 0 || transaction.balance.percentage > 100))) {
                elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [isValidSwapContent] Invalid balance configuration: ${JSON.stringify(transaction.balance)}`);
                await callback?.({
                    text: "Invalid balance configuration. Please check balance details.",
                    content: {
                        error: "INVALID_BALANCE",
                        details: "Invalid balance configuration"
                    }
                });
                return false;
            }
        }
    }

    return true;
}

interface Balance {
    source_token: string;
    type: 'FULL' | 'PERCENTAGE';
    percentage: number;
}

interface SwapTransaction {
    sellToken: string;
    buyToken: string;
    sellQuantity: number | null;
    buyQuantity: number | null;
    value_type?: 'USD';
    balance?: {
        source_token: string;
        type: 'FULL' | 'PERCENTAGE';
        percentage: number;
    };
}

interface CreatorCoinSwapResponse {
    success: boolean;
    action: 'BUY' | 'SELL' | 'SWAP';
    transaction_type: 'DIRECT' | 'BALANCE_BASED' | 'MULTI_CREATOR';
    is_followup: boolean;
    transactions: SwapTransaction[];
    error?: {
        missing_fields: string[];
        prompt_message: string;
    };
    confirmation_required: boolean;
    confirmation_message?: string;
}

/**
 * Swaps Token to Moxie tokens using 0x protocol
 * @param moxieUserId The user ID of the person performing the swap
 * @param tokenAddress The address of the token to swap
 * @param tokenSymbol The symbol of the token to swap
 * @param decimals The number of decimals of the token
 * @param agentWalletAddress The wallet address to receive the Moxie tokens
 * @param amountInWEI The amount of ETH to swap, can be string or number
 * @param provider The ethers JsonRpcProvider instance
 * @param callback Optional callback function to receive status updates
 * @returns Promise that resolves to the amount of Moxie tokens received in WEI
 */
async function swapToMoxie(
    tokenAddress: string,
    tokenSymbol: string,
    moxieUserId: string,
    agentWalletAddress: string,
    amountInWEI: bigint,
    provider: ethers.JsonRpcProvider,
    callback: any,
    decimals: number
): Promise<bigint> {
    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] called, tokenAddress: ${tokenAddress}, tokenSymbol: ${tokenSymbol}, agentWalletAddress: ${agentWalletAddress}, amount: ${amountInWEI}`);
    let moxieInWEI: bigint;
    let tokenBalance: bigint;
    let quote: GetQuoteResponse | null = null;
    try {
        // call 0x api to swap eth to moxie
        quote = await get0xSwapQuote({
            moxieUserId: moxieUserId,
            sellAmountBaseUnits: amountInWEI.toString(),
            buyTokenAddress: process.env.MOXIE_TOKEN_ADDRESS,
            walletAddress: agentWalletAddress,
            sellTokenAddress: tokenAddress,
        });
        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] 0x quote: ${JSON.stringify(quote)}`);

        if (tokenSymbol != "ETH") { // for other currencies we need to check allowance and approve spending
            // check allowance and approve spending
            const issues = quote.issues;
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] issues: ${JSON.stringify(issues)}`);
            // check allowance and approve spending
            if (issues.allowance && issues.allowance != null) {
                await checkAllowanceAndApproveSpendRequest(
                    moxieUserId,
                    agentWalletAddress,
                    tokenAddress,
                    // @ts-ignore
                    issues.allowance.spender,
                    amountInWEI,
                    provider,
                    privy,
                    callback);
                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] checkAllowanceAndApproveSpendRequest completed`);
            }
            // check balance and approve spending
            if (issues.balance && issues.balance != null) {
                const balance = await getERC20Balance(tokenAddress, agentWalletAddress);
                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] tokenBalance: ${balance}`);
                if (balance) {
                    tokenBalance = BigInt(balance);
                }
                if (tokenBalance < amountInWEI) {
                    await callback?.({
                        text: `Insufficient ${tokenSymbol} balance to complete this purchase.`,
                        content: {
                            error: "INSUFFICIENT_TOKEN_BALANCE",
                            details: `Insufficient ${tokenSymbol} balance to complete this purchase.`,
                        }
                    });
                    return tokenBalance;
                };
            }
        }
    } catch (error) {
        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] Error getting 0x quote: ${JSON.stringify(error)}`);
        await callback?.({
            text: `Failed to swap ${tokenSymbol} to MOXIE tokens. ${JSON.stringify(error)}`,
            content: {
                error: `${tokenSymbol}_TO_MOXIE_SWAP_FAILED`,
                details: `Failed to swap ${tokenSymbol} to MOXIE tokens.`,
            }
        });
        throw new Error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] Error getting 0x quote: ${JSON.stringify(error)}`);
    }

    if (tokenSymbol != "ETH") { // skip for ETH
        // signature related
        let signResponse: EthereumSignTypedDataResponseType | undefined;
        try {
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] quote.permit2.eip712: ${JSON.stringify(quote.permit2?.eip712)}`);
            if (quote.permit2?.eip712) {
                signResponse = await privy.walletApi.ethereum.signTypedData({
                    address: agentWalletAddress,
                    chainType: "ethereum",
                    typedData: quote.permit2.eip712
                });
                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] signResponse: ${JSON.stringify(signResponse)}`);
            }

            if (signResponse && signResponse.signature && quote.transaction?.data) {
                const signatureLengthInHex = numberToHex(size(signResponse.signature as Hex), {
                    signed: false,
                    size: 32,
                });
                // Append signature length and data to transaction
                quote.transaction.data = concat([quote.transaction.data, signatureLengthInHex, signResponse.signature]);
                elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] quote.transaction.data: ${JSON.stringify(quote.transaction.data)}`);
            }
        } catch (error) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] Error signing typed data: ${JSON.stringify(error)}`);
            await callback?.({
                text: `Failed to sign typed data. ${JSON.stringify(error)}`,
                content: {
                    error: "SIGN_TYPED_DATA_FAILED",
                    details: `Failed to sign typed data.`,
                }
            });
        }
    }

    // execute 0x swap
    let tx: EthereumSendTransactionResponseType | null = null;
    try {
        tx = await execute0xSwap({
            moxieUserId: moxieUserId,
            walletAddress: agentWalletAddress,
            quote: quote,
        });
        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] 0x tx: ${JSON.stringify(tx)}`);
    } catch (error) {
        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] Error executing 0x swap: ${JSON.stringify(error)}`);
        await callback?.({
            text: `Failed to swap ${tokenSymbol} to MOXIE tokens. ${JSON.stringify(error)}`,
            content: {
                error: `${tokenSymbol}_TO_MOXIE_SWAP_FAILED`,
                details: `Failed to swap ${tokenSymbol} to MOXIE tokens.`,
            }
        });
        throw new Error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] Error executing 0x swap: ${JSON.stringify(error)}`);
    }

    await callback?.({
        text: `${tokenSymbol} to MOXIE conversion is in progress. View transaction status at: https://basescan.org/tx/${tx.hash}`,
        content: {
            url: `https://basescan.org/tx/${tx.hash}`,
        }
    });

    // wait for tx to be mined
    let txnReceipt: ethers.TransactionReceipt | null;
    try {
        txnReceipt = await handleTransactionStatus(moxieUserId, provider, tx.hash);
        if (!txnReceipt) {
            elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] txnReceipt is null`);
            await callback?.({
                text: `Transaction receipt is not present for ${tx.hash}. Please try again or contact support if the issue persists.`,
                content: {
                    error: "TRANSACTION_RECEIPT_NULL",
                    details: `Transaction receipt is not present for ${tx.hash}. Please try again or contact support if the issue persists.`
                }
            });
            throw new Error("Transaction receipt is null");
        }
    } catch (error) {
        await callback?.({
            text: `Error processing ${tokenSymbol} to MOXIE swap: ${error.message}`
        });
        return moxieInWEI;
    }

    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] 0x swap txnReceipt: ${JSON.stringify(txnReceipt)}`);
    if (txnReceipt.status == 1) {
        // decode the txn receipt to get the moxie purchased
        const transferDetails = await decodeMoxieTokenTransfer(moxieUserId, txnReceipt);
        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] 0x swap decodeMoxieTokenTransfer: ${JSON.stringify(transferDetails)}`);
        if (transferDetails) {
            moxieInWEI = BigInt(transferDetails.amount);
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [swapToMoxie] moxieInWEI: ${moxieInWEI}`)
        } else {
            await callback?.({
                text: `Unable to decode MOXIE tokens purchased from the transaction receipt. Please try again or contact support if the issue persists.`,
                content: {
                    error: "MOXIE_DECODE_ERROR",
                    details: `Failed to decode MOXIE tokens purchased from the transaction receipt`
                }
            });
            return moxieInWEI;
        }

        await callback?.({
            text: `${tokenSymbol} to MOXIE conversion completed successfully.\nAmount: ${ethers.formatUnits(amountInWEI.toString(), decimals)} ${tokenSymbol} → ${ethers.formatEther(moxieInWEI)} MOXIE\nTransaction Details: https://basescan.org/tx/${tx.hash}`,
            content: {
                url: `https://basescan.org/tx/${tx.hash}`,
            }
        });
        return moxieInWEI;
    } else {
        await callback?.({
            text: `Failed to swap ${tokenSymbol} to MOXIE tokens. View transaction details: https://basescan.org/tx/${tx.hash}`,
            content: {
                error: `${tokenSymbol}_TO_MOXIE_SWAP_FAILED`,
                details: `Failed to swap ${tokenSymbol} to MOXIE tokens. View transaction details: https://basescan.org/tx/${tx.hash}`,
            }
        });
        return moxieInWEI;
    }
}

/**
 * Get the quantity required in WEI for swaps with USD value type
 * @param moxieUserId The user ID of the person performing the swap
 * @param sellTokenSymbol The symbol of the token to sell
 * @param sellTokenAddress The address of the token to sell
 * @param quantity The quantity of the token to sell
 * @param agentWallet The wallet address to receive the tokens
 * @param callback The callback function to receive status updates
 * @returns Promise that resolves to the quantity required in WEI
 */
async function getTargetQuantityForSwapsWithUSDValueType(
    moxieUserId: string,
    sellTokenSymbol: string,
    sellTokenAddress: string,
    quantity: bigint,
    agentWallet: any,
    callback: any
): Promise<bigint> {
    let quantityRequiredInWEI: bigint;
    if (sellTokenSymbol != USDC) { // for other currencies we need to get equivalent amount in their respective currency
        const price = await get0xPrice({
            moxieUserId: moxieUserId,
            sellAmountBaseUnits: quantity.toString(),
            buyTokenAddress: sellTokenAddress,
            walletAddress: agentWallet.address,
            sellTokenAddress: USDC_ADDRESS,
        });
        elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] price: ${JSON.stringify(price)} to get ${quantity} equivalent amount in ${sellTokenSymbol}`);
        quantityRequiredInWEI = BigInt(price.buyAmount);
    } else {
        quantityRequiredInWEI = quantity;
    }

    let availableTokenBalanceInWEI: bigint;
    // Check agent wallet balance
    const balance = sellTokenSymbol === "ETH"
        ? await getNativeTokenBalance(agentWallet.address)
        : await getERC20Balance(sellTokenAddress, agentWallet.address);

    availableTokenBalanceInWEI = balance !== "" ? BigInt(balance) : 0n;

    if (quantityRequiredInWEI > availableTokenBalanceInWEI) {
        await callback?.({
            text: `Insufficient ${sellTokenSymbol} balance to complete this purchase.`,
            content: {
                error: "INSUFFICIENT_TOKEN_BALANCE",
                details: `Insufficient ${sellTokenSymbol} balance to complete this purchase.`
            }
        });
        throw new Error(`[creatorCoinSwap] [${moxieUserId}] [getTargetQuantityForSwapsWithUSDValueType] Insufficient ${sellTokenSymbol} balance to complete this purchase.`);
    }
    return quantityRequiredInWEI;
}

/**
 * Get the current wallet balance
 * @param moxieUserId The user ID of the person performing the swap
 * @param sellToken The token to sell
 * @param agentWallet The wallet address to receive the tokens
 * @param balance The balance object
 * @param callback The callback function to receive status updates
 * @returns Promise that resolves to the quantity required in WEI
 */
async function getTargetQuantityForBalanceBasedSwaps(
    moxieUserId: string,
    sellTokenAddress: string,
    sellTokenSymbol: string,
    agentWallet: any,
    balance: Balance,
    callback: any
): Promise<bigint> {
    let quantityInWEI: bigint;
    const currentWalletBalance = sellTokenSymbol === "ETH"
        ? await getNativeTokenBalance(agentWallet.address)
        : await getERC20Balance(sellTokenAddress, agentWallet.address);
    elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [getTargetQuantityForBalanceBasedSwaps] currentWalletBalance: ${currentWalletBalance} ${sellTokenAddress}`);
    if (currentWalletBalance) {
      // calculate the percentage to be used for the swap
      const percentage = balance.percentage;
      quantityInWEI = (BigInt(currentWalletBalance) * BigInt(percentage * 100)) / BigInt(10000);
      elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [balance] quantityInWEI: ${quantityInWEI}`);
    } else {
        elizaLogger.error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [balance] currentWalletBalance is null`);
        await callback?.({
            text: `Unable to fetch balance for ${sellTokenSymbol}. Please try again or contact support if the issue persists.`,
            content: {
                error: "BALANCE_FETCH_ERROR",
                details: `Unable to fetch balance for ${sellTokenSymbol}. Please try again or contact support if the issue persists.`
            }
        });
        throw new Error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] [balance] currentWalletBalance is null`);
    }
    return quantityInWEI;
}

/**
 * Fetches FTA responses for given creator IDs
 * @param creatorIds - Array of creator IDs to fetch FTA responses for
 * @param moxieUserId - The user ID of the person performing the swap
 * @param runtime - The runtime environment
 * @param callback - The callback function to receive status updates
 * @returns Promise that resolves to a record of creator IDs and their FTA responses
*/
async function getFtaResponses(
    creatorIds: string[],
    moxieUserId: string,
    runtime: any,
    callback: HandlerCallback
): Promise<Record<string, any>> {
    const ftaResponses: Record<string, any> = {};
    for (const creatorId of creatorIds) {
        const ftaResponse = await runtime.cacheManager.get(`userftadetails-${creatorId}`);
        if (ftaResponse) {
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] fta response fetched successfully from cache for creator moxie user id: ${creatorId}, ${JSON.stringify(ftaResponse)}`);
            ftaResponses[creatorId] = ftaResponse;
        } else {
            const newFtaResponse = await ftaService.getUserFtaData(creatorId);
            if (!newFtaResponse || newFtaResponse == null) {
                await callback?.({
                    text: `Unable to fetch creator details. The creator with ID ${creatorId} could not be found. Please verify the creator ID and try again later.`,
                    content: {
                        error: "CREATOR_NOT_FOUND",
                        details: `Failed to fetch FTA details for creator with ID ${creatorId}`
                    }
                });
                throw new Error(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] Unable to fetch creator details. The creator with ID ${creatorId} could not be found. Please verify the creator ID and try again later.`);
            }
            await runtime.cacheManager.set(`userftadetails-${creatorId}`, newFtaResponse);
            ftaResponses[creatorId] = newFtaResponse;
            elizaLogger.debug(`[creatorCoinSwap] [${moxieUserId}] [creatorCoinSwapAction] fta response fetched successfully for creator ${creatorId} and set in cache`);
        }
    }
    return ftaResponses;
}