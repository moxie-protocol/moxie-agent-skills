import {
    EthereumSignMessageResponseType,
    EthereumSignTypedDataResponseType,
    EthereumSendTransactionResponseType,
    EthereumSendTransactionInputType,
    Wallet,
    Hex,
} from "@privy-io/server-auth";
import { ethers } from "ethers";
import { senpiUserService } from ".";
import { TransactionDetails } from "./services/types";

export class SenpiWalletClient {
    address: string;
    // make this private to avoid usage on local development
    private wallet: ethers.Wallet;
    private bearerToken: string;

    constructor(address: string, bearerToken?: string) {
        this.address = address;
        this.bearerToken = bearerToken;
        if (process.env.PRIVATE_KEY) {
            if (process.env.RPC_URL) {
                this.wallet = new ethers.Wallet(
                    process.env.PRIVATE_KEY
                ).connect(new ethers.JsonRpcProvider(process.env.RPC_URL));
                this.address = this.wallet.address;
            } else {
                throw new Error("RPC_URL is required");
            }
        }
    }

    /**
     * Sign a message with the wallet
     * @param message - The message to sign
     * @returns The signature and encoding of the message
     */
    async signMessage(
        message: string
    ): Promise<SenpiWalletSignMessageResponseType> {
        //Add validation that bearerToken or private key is present
        if (!validateRequest(this.bearerToken)) {
            throw new Error("Bearer token or private key is required");
        }
        if (process.env.PRIVATE_KEY) {
            const signature = await this.wallet.signMessage(message);
            return {
                signature,
                encoding: "utf8",
            };
        }

        return await senpiUserService.SignMessage(
            { message, address: this.address },
            this.bearerToken
        );
    }

    /**
     * Sign typed data with the wallet with the minimum required fields
     * @param domain - The domain of the typed data
     * @param types - The types of the typed data
     * @param message - The message of the typed data
     * @param primaryType - The primary type of the typed data
     * @returns The signature and encoding of the typed data
     */
    async signTypedData(
        domain: Record<string, any>,
        types: Record<string, any>,
        message: Record<string, any>,
        primaryType: string
    ): Promise<SenpiWalletSignTypedDataResponseType> {
        if (!validateRequest(this.bearerToken)) {
            throw new Error("Bearer token or private key is required");
        }
        if (process.env.PRIVATE_KEY) {
            // Remove EIP712Domain from types if present
            const { EIP712Domain, ...filteredTypes } = types;
            const signature = await this.wallet.signTypedData(
                domain,
                filteredTypes,
                message
            );
            return {
                signature,
                encoding: "utf8",
            };
        }
        return await senpiUserService.SignTypedData(
            {
                domain: domain,
                types: types,
                message: message,
                primaryType,
                address: this.address,
            },
            this.bearerToken
        );
    }

    /**
     * Send a transaction with the wallet
     * @param chainId - The chain ID of the network to send the transaction on
     * @param transactionDetails - The transaction details object containing:
     * @param transactionDetails.toAddress - The recipient address
     * @param transactionDetails.value - The amount of native currency to send
     * @param transactionDetails.data - (Optional) The transaction data payload
     * @param transactionDetails.fromAddress - (Optional) The sender address
     * @param transactionDetails.gasLimit - (Optional) The maximum gas units to consume
     * @param transactionDetails.gasPrice - (Optional) The gas price in wei
     * @param transactionDetails.maxFeePerGas - (Optional) The maximum total fee per gas for EIP-1559 transactions
     * @param transactionDetails.maxPriorityFeePerGas - (Optional) The maximum priority fee per gas for EIP-1559 transactions
     * @returns The transaction hash and the CAIP-2 chain identifier
     */

    async sendTransaction(
        chainId: string,
        transactionDetails: TransactionDetails
    ): Promise<SenpiWalletSendTransactionResponseType> {
        if (!validateRequest(this.bearerToken)) {
            throw new Error("Bearer token or private key is required");
        }
        if (process.env.PRIVATE_KEY) {
            const transaction = await this.wallet.sendTransaction({
                to: transactionDetails.toAddress,
                value: transactionDetails.value,
                data: transactionDetails.data,
                gasLimit: transactionDetails.gasLimit,
                maxFeePerGas: transactionDetails.maxFeePerGas,
                maxPriorityFeePerGas: transactionDetails.maxPriorityFeePerGas,
            });
            return {
                hash: transaction.hash,
                caip2: `eip155:${chainId}`,
            };
        }

        let response = await senpiUserService.sendTransaction(
            {
                chainId: Number(chainId),
                address: this.address,
                from: transactionDetails.fromAddress,
                to: transactionDetails.toAddress,
                value: transactionDetails.value
                    ? transactionDetails.value.toString()
                    : null,
                data: transactionDetails.data,
                gasLimit: transactionDetails.gasLimit
                    ? transactionDetails.gasLimit.toString()
                    : null,
                gasPrice: transactionDetails.gasPrice
                    ? transactionDetails.gasPrice.toString()
                    : null,
                maxFeePerGas: transactionDetails.maxFeePerGas
                    ? transactionDetails.maxFeePerGas.toString()
                    : null,
                maxPriorityFeePerGas: transactionDetails.maxPriorityFeePerGas
                    ? transactionDetails.maxPriorityFeePerGas.toString()
                    : null,
            },
            this.bearerToken
        );

        return {
            hash: response.hash,
            caip2: `eip155:${chainId}`,
        };
    }
}

//Add validation that bearerToken or private key is present
function validateRequest(bearerToken: string): boolean {
    if (process.env.PRIVATE_KEY) {
        return true;
    }
    return Boolean(bearerToken);
}

export type SenpiWalletSignMessageResponseType =
    EthereumSignMessageResponseType;
export type SenpiWalletSignTypedDataResponseType =
    EthereumSignTypedDataResponseType;
export type SenpiWalletSendTransactionResponseType =
    EthereumSendTransactionResponseType;
export type SenpiWalletSendTransactionInputType =
    EthereumSendTransactionInputType;
export type SenpiClientWallet = Wallet;
export type SenpiHex = Hex;
