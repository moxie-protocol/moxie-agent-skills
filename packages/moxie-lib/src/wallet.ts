import { PrivyClient, EthereumSignMessageResponseType, EthereumSignTypedDataResponseType, EthereumSendTransactionResponseType } from "@privy-io/server-auth";
import { TypedData } from "viem";



export class MoxieWallet {

    // Creating a singleton instance of PrivyClient
    private static privyClient: PrivyClient;
    address: string;

    constructor(address: string) {
        this.address = address;
        // Initialize the PrivyClient if it hasn't been initialized yet
        if (!MoxieWallet.privyClient) {
            MoxieWallet.privyClient = new PrivyClient(
                process.env.PRIVY_APP_ID as string,
                process.env.PRIVY_APP_SECRET as string,
            );
        }
    }

    /**
     * Sign a message with the wallet
     * @param message - The message to sign
     * @returns The signature and encoding of the message
     */
    async signMessage(message: string): Promise<MoxieWalletSignMessageResponseType> {
        return await MoxieWallet.privyClient.walletApi.ethereum.signMessage({
            message,
            chainType: "ethereum",
            address: this.address,
        });
    }

    /**
     * Sign typed data with the wallet with the minimum required fields
     * @param domain - The domain of the typed data
     * @param types - The types of the typed data
     * @param message - The message of the typed data
     * @param primaryType - The primary type of the typed data
     * @returns The signature and encoding of the typed data
     */
    async signTypedDataMinimal(domain: Record<string, any>, types: Record<string, any>, message: Record<string, any>, primaryType: string): Promise<MoxieWalletSignTypedDataResponseType> {
        return await MoxieWallet.privyClient.walletApi.ethereum.signTypedData({
            typedData: {
                domain,
                types,
                message,
                primaryType,
            },
            chainType: "ethereum",
            address: this.address,
        });
    }


    /**
     * Sign typed data with the wallet
     * @param typedData - The typed data to sign.
     * @returns The signature and encoding of the typed data
     */
    async signTypedData(typedData: TypedData): Promise<MoxieWalletSignTypedDataResponseType> {
        return await MoxieWallet.privyClient.walletApi.ethereum.signTypedData({
            typedData: typedData,
            chainType: "ethereum",
            address: this.address,
        });
    }

    /**
     * Send a transaction with the wallet
     * @param chainId - The chain ID to send the transaction on
     * @param toAddress - The address to send the transaction to
     * @param value - The value of the transaction
     * @param data - The data of the transaction
     * @param gasLimit - The gas limit of the transaction
     * @param gasPrice - The gas price of the transaction
     * @returns The transaction hash and the chain ID of the transaction's network
     */
    async sendTransaction(chainId: string, toAddress: string, value: number, data: string, gasLimit: number, gasPrice: number): Promise<MoxieWalletSendTransactionResponseType> {
        return await MoxieWallet.privyClient.walletApi.ethereum.sendTransaction({
            transaction: {
                to: toAddress,
                value: value,
                data: data,
                gasLimit: gasLimit,
                gasPrice: gasPrice,
                chainId: chainId,
            },
            chainType: "ethereum",
            address: this.address,
            caip2: `eip155:${chainId}`,
        });
    }
}

type MoxieWalletSignMessageResponseType = EthereumSignMessageResponseType;
type MoxieWalletSignTypedDataResponseType = EthereumSignTypedDataResponseType;
type MoxieWalletSendTransactionResponseType = EthereumSendTransactionResponseType;