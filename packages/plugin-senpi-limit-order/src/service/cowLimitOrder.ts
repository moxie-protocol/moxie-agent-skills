import {
    CowEnv,
    OrderBookApi,
    OrderCreation,
    SupportedChainId,
} from "@cowprotocol/cow-sdk";

import { elizaLogger } from "@senpi-ai/core";
import {
    SenpiAgentDBAdapter,
    TransactionDetails,
} from "@senpi-ai/senpi-agent-lib";
import {
    SenpiClientWalet,
    SenpiWalletClient,
    SenpiWalletSignTypedDataResponseType,
} from "@senpi-ai/senpi-agent-lib/src/wallet";
import { ethers } from "ethers";
import axios from "axios";
import { Context } from "../types/types";

const TRANSACTION_RECEIPT_TIMEOUT = process.env.TRANSACTION_RECEIPT_TIMEOUT
    ? Number(process.env.TRANSACTION_RECEIPT_TIMEOUT)
    : 60000;

const Erc20Abi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
];

const cowVaultRelayerAddress = process.env.COW_PROTOCOL_VAULT_RELAYER_ADDRESS;
const cowProtocolVerifierContractAddress =
    process.env.COW_PROTOCOL_VERIFIER_CONTRACT_ADDRESS;

const orderTypes = {
    Order: [
        { name: "sellToken", type: "address" },
        { name: "buyToken", type: "address" },
        { name: "receiver", type: "address" },
        { name: "sellAmount", type: "uint256" },
        { name: "buyAmount", type: "uint256" },
        { name: "validTo", type: "uint32" },
        { name: "appData", type: "bytes32" },
        { name: "feeAmount", type: "uint256" },
        { name: "kind", type: "string" },
        { name: "partiallyFillable", type: "bool" },
        { name: "sellTokenBalance", type: "string" },
        { name: "buyTokenBalance", type: "string" },
    ],
    EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
    ],
};

const domain = {
    name: "Gnosis Protocol",
    version: "v2",
    chainId: process.env.CHAIN_ID || "8453",
    verifyingContract: cowProtocolVerifierContractAddress,
};

const orderBookApi = new OrderBookApi({
    env: process.env.COW_ENV as CowEnv,
    chainId: Number(process.env.CHAIN_ID || "8453") as SupportedChainId,
});

/**
 * Create a limit order on the Cow Protocol
 * @param context - The context object containing traceId, provider, state and other details
 * @param orderParams - The order parameters to create
 * @returns The created order id
 * @throws Error if required fields are missing or if approval/order creation fails
 */
export async function createCowLimitOrder(
    context: Context,
    orderParams: OrderCreation
): Promise<string> {
    const { traceId, provider, state } = context;
    elizaLogger.debug(traceId, "[createCowLimitOrder] started");

    // Validate required fields with more descriptive error messages
    const requiredFields = {
        traceId: [
            context.traceId,
            "Trace ID is required for logging and tracking",
        ],
        provider: [
            context.provider,
            "Web3 provider is required for blockchain interactions",
        ],
        state: [context.state, "State object is required"],
        agentWallet: [
            context.state?.agentWallet,
            "Agent wallet is required for transactions",
        ],
        SenpiWalletClient: [
            context.state.SenpiWalletClient,
            "Senpi wallet client is required for transactions",
        ],
        orderParams: [orderParams, "Order parameters are required"],
        sellToken: [orderParams?.sellToken, "Sell token address is required"],
        buyToken: [orderParams?.buyToken, "Buy token address is required"],
        sellAmount: [orderParams?.sellAmount, "Sell amount is required"],
        buyAmount: [orderParams?.buyAmount, "Buy amount is required"],
        cowVaultRelayerAddress: [
            cowVaultRelayerAddress,
            "COW vault relayer address is required",
        ],
        appData: [
            orderParams?.appData,
            "COW limit order app data hash is required",
        ],
    };

    for (const [field, [value, message]] of Object.entries(requiredFields)) {
        if (!value) {
            elizaLogger.error(
                traceId,
                `[createCowLimitOrder] Missing required field: ${field}`
            );
            throw new Error(`Missing required field: ${field}. ${message}`);
        }
    }

    try {
        // Create contract instance for the sell token
        const tokenContract = new ethers.Contract(
            orderParams.sellToken,
            Erc20Abi,
            provider
        );

        const agentWallet = (context.state.agentWallet as SenpiClientWalet)
            .address;
        elizaLogger.debug(
            traceId,
            "[createCowLimitOrder] Using agent wallet:",
            agentWallet
        );

        // Check token balance to ensure sufficient funds
        const balance = await tokenContract.balanceOf(agentWallet);
        elizaLogger.debug(
            traceId,
            `[createCowLimitOrder] Current balance for token ${orderParams.sellToken}:`,
            balance.toString()
        );

        if (balance == 0) {
            // If balance is 0, throw an error. Cow protocol supports to create limit order when balance is > 0
            elizaLogger.error(
                traceId,
                `[createCowLimitOrder] Insufficient ${orderParams.sellToken} balance to create limit order`
            );
            throw new Error(
                `Insufficient ${orderParams.sellToken} balance to create limit order`
            );
        }

        // Check and handle token approval
        const allowance = await tokenContract.allowance(
            agentWallet,
            cowVaultRelayerAddress
        );
        elizaLogger.debug(
            traceId,
            "[createCowLimitOrder] Current allowance for vault relayer:",
            allowance.toString()
        );

        if (allowance.lt(orderParams.sellAmount)) {
            elizaLogger.debug(
                traceId,
                "[createCowLimitOrder] Insufficient allowance, initiating approval"
            );
            const approveTxData =
                await tokenContract.populateTransaction.approve(
                    cowVaultRelayerAddress,
                    ethers.constants.MaxUint256.toString()
                );
            elizaLogger.debug(
                traceId,
                "[createCowLimitOrder] Approval transaction data:",
                approveTxData
            );

            const sendTransactionResponse =
                await sendApprovalTransactionFromEmbeddedWallet(
                    context,
                    approveTxData as ethers.ContractTransaction
                );
            elizaLogger.debug(
                traceId,
                "[createCowLimitOrder] Approval transaction completed:",
                sendTransactionResponse
            );
        } else {
            elizaLogger.debug(
                traceId,
                "[createCowLimitOrder] Allowance sufficient: vault relayer has approval from agent wallet"
            );
        }

        // Get order signature and prepare final order parameters
        const signatureData = await signTypedDataFromEmbeddedWallet(
            context,
            orderParams
        );
        elizaLogger.debug(
            traceId,
            "[createCowLimitOrder] Order signature data:",
            JSON.stringify(signatureData)
        );

        if (!signatureData?.signature) {
            throw new Error("Failed to obtain valid signature for order");
        }

        const finalOrderParams = {
            ...orderParams,
            signature: signatureData.signature,
        };
        elizaLogger.debug(
            traceId,
            "[createCowLimitOrder] Final order parameters:",
            JSON.stringify(finalOrderParams)
        );

        // Send order to cow
        const order = await orderBookApi.sendOrder(finalOrderParams);
        elizaLogger.debug(
            traceId,
            "[createCowLimitOrder] Order created:",
            order
        );

        return order;
    } catch (error) {
        elizaLogger.error(
            traceId,
            "[createCowLimitOrder] Failed to create order:",
            error
        );
        throw new Error(`Failed to create COW limit order: ${error.message}`);
    }
}

/**
 * Send a transaction from the embedded wallet
 * @param context - The context object containing traceId, provider, state and other details
 * @param sellTokenAddress - The address of the sell token
 * @param tx - The populated transaction to send
 * @returns The transaction response data from the wallet
 * @throws Error if transaction fails or times out
 */
async function sendApprovalTransactionFromEmbeddedWallet(
    context: Context,
    tx: ethers.ContractTransaction
) {
    const { traceId, senpiUserId } = context;
    elizaLogger.debug(
        traceId,
        "[sendApprovalTransactionFromEmbeddedWallet] started"
    );

    const agentWallet = (context.state.agentWallet as SenpiClientWalet).address;
    const chainId = process.env.CHAIN_ID || "8453";
    const SenpiWalletClient = context.state
        .SenpiWalletClient as SenpiWalletClient;

    try {
        const sendTransactionInput: TransactionDetails = {
            toAddress: tx.to,
            data: tx.data,
            fromAddress: agentWallet,
        };
        elizaLogger.debug(
            traceId,
            `[sendApprovalTransactionFromEmbeddedWallet] sendTransactionInput: ${JSON.stringify(
                sendTransactionInput
            )}`
        );

        const sendTransactionResponse = await SenpiWalletClient.sendTransaction(
            chainId,
            sendTransactionInput
        );
        elizaLogger.debug(
            traceId,
            `[sendApprovalTransactionFromEmbeddedWallet] sendTransactionResponse: ${JSON.stringify(
                sendTransactionResponse
            )}`
        );

        // Wait for and validate transaction receipt
        const txnReceipt = await context.provider.waitForTransaction(
            sendTransactionResponse.hash,
            1,
            TRANSACTION_RECEIPT_TIMEOUT
        );

        if (!txnReceipt) {
            elizaLogger.error(
                traceId,
                `[${senpiUserId}] [sendApprovalTransactionFromEmbeddedWallet] Transaction receipt timeout`
            );
            throw new Error("Approval transaction failed: Receipt not found");
        }

        if (txnReceipt.status === 1) {
            // 1 is success
            elizaLogger.debug(
                traceId,
                `[${senpiUserId}] [sendApprovalTransactionFromEmbeddedWallet] approval transaction successful: ${sendTransactionResponse.hash}`
            );
            return sendTransactionResponse;
        }

        elizaLogger.error(
            traceId,
            `[${senpiUserId}] [sendApprovalTransactionFromEmbeddedWallet] approval transaction failed: ${sendTransactionResponse.hash} with status: ${txnReceipt.status}`
        );
        throw new Error("Approval transaction failed: Transaction reverted");
    } catch (error) {
        elizaLogger.error(
            traceId,
            `[sendApprovalTransactionFromEmbeddedWallet] unhandled error: ${error.message}`,
            error
        );
        throw error;
    }
}

/**
 * Helper function to send transaction with retries and exponential backoff
 */
async function sendTransactionWithRetries(
    url: string,
    token: string,
    variables: any,
    maxRetries = 3
): Promise<Response> {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: `
                        query SendTransaction($address: String!, $from: String!, $to: String!, $data: String!, $chainId: Int!) {
                            SendTransaction(
                                input: {
                                    address: $address
                                    from: $from
                                    to: $to
                                    data: $data
                                    chainId: $chainId
                                }
                            ) {
                                hash
                                caip2
                                code
                                message
                            }
                        }
                    `,
                    variables,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
                throw error;
            }
            // Exponential backoff
            await new Promise((resolve) =>
                setTimeout(resolve, Math.pow(2, retryCount) * 1000)
            );
        }
    }

    throw new Error("Max retries exceeded");
}

/**
 * Sign a typed data from the embedded wallet
 * @param context - The context object containing traceId, provider, state and other details
 * @param orderParams - The order parameters to sign
 * @returns The signature data from the wallet
 * @throws Error if signing fails or if required parameters are missing
 */
async function signTypedDataFromEmbeddedWallet(
    context: Context,
    orderParams: OrderCreation
): Promise<SenpiWalletSignTypedDataResponseType> {
    const { traceId } = context;
    elizaLogger.debug(
        traceId,
        "[signTypedDataFromEmbeddedWallet] started with orderParams",
        orderParams
    );

    try {
        const SenpiWalletClient = context.state
            .SenpiWalletClient as SenpiWalletClient;
        const orderData = {
            types: orderTypes,
            domain,
            primaryType: "Order",
            message: orderParams,
        };

        elizaLogger.debug(
            traceId,
            "[signTypedDataFromEmbeddedWallet] orderData:",
            JSON.stringify(orderData)
        );

        const signatureData = await SenpiWalletClient.signTypedData(
            orderData.domain,
            orderData.types,
            orderData.message,
            orderData.primaryType
        );
        elizaLogger.debug(
            traceId,
            "[signTypedDataFromEmbeddedWallet] signatureData:",
            JSON.stringify(signatureData)
        );

        return signatureData;
    } catch (error) {
        elizaLogger.error(
            traceId,
            "[signTypedDataFromEmbeddedWallet] Failed to sign order data:",
            error
        );
        throw new Error(`Failed to sign order data: ${error.message}`);
    }
}
