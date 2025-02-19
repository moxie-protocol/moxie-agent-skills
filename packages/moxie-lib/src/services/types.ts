export interface TwitterMetadata {
    username: string;
    name?: string;
    type?: string;
    subject?: string;
    verifiedAt?: string;
    firstVerifiedAt?: string;
    latestVerifiedAt?: string;
    profilePictureUrl?: string;
}

export interface ENSMetadata {
    username?: string;
    ens: string;
    expiryTimestamp: string;
    resolvedAddress: string;
}

export interface FarcasterMetadata {
    bio: string;
    fid: number;
    pfp: string;
    type: string;
    username: string;
    verifiedAt: string;
    displayName: string;
    ownerAddress: string;
    firstVerifiedAt: string;
    latestVerifiedAt: string;
}

export interface MoxieIdentity {
    id: string;
    userId: string;
    type: string;
    dataSource: string;
    connectedIdentitiesFetchStatus: string;
    metadata: TwitterMetadata | FarcasterMetadata | ENSMetadata;
    profileId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MoxieWallet {
    id: string;
    userId: string;
    walletAddress: string;
    walletType: string;
    dataSource?: string;
    createdAt: string;
    deletedAt?: string;
}

export interface MoxieUser {
    id: string;
    userName?: string;
    name?: string;
    bio?: string | null;
    profileImageUrl?: string;
    referralCode: string;
    referrerId?: string;
    moxieScore?: number;
    moxieRank?: number;
    totalUsers?: number;
    primaryWalletId?: string;
    communicationPreference?: string;
    createdAt: string;
    moxieScoreResyncInfo?: {
        status: string;
    };
    identities: MoxieIdentity[];
    wallets: MoxieWallet[];
}

export interface TransactionDetails {
    fromAddress?: string;
    toAddress?: string;
    value?: number;
    data?: string;
    gasLimit?: number;
    gasPrice?: number;
    maxFeePerGas?: number;
    maxPriorityFeePerGas?: number;
}

export type EthereumSignMessageResponseType = {
    signature: string;
    encoding: string;
};

export type EthereumSignTypedDataResponseType = {
    signature: string;
    encoding: string;
};

export type EthereumSignTransactionResponseType = {
    signedTransaction: string;
    encoding: string;
};

export type EthereumSendTransactionResponseType = {
    hash: string;
    caip2: EvmCaip2ChainId;
};

export type EthereumSendTransactionInputType = EthereumRpcWrapper<
    EthereumBaseTransactionInputType & {
        /** CAIP-2 chain ID for the network to broadcast the transaction on. */
        caip2: EvmCaip2ChainId;
    }
>;

type EthereumRpcWrapper<T> = WithOptionalIdempotencyKey<
    WithWalletIdOrAddressChainType<T, "ethereum">
>;

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

type WithOptionalIdempotencyKey<T> = Prettify<
    T & {
        idempotencyKey?: string;
    }
>;

type WithWalletIdOrAddressChainType<T, U extends "solana" | "ethereum"> =
    | Prettify<
          T & {
              /** Address of the wallet. */
              address: string;
              /** Chain type of the wallet. */
              chainType: U;
          }
      >
    | Prettify<
          T & {
              /** ID of the wallet. */
              walletId: string;
          }
      >;

type EthereumBaseTransactionInputType = {
    transaction: {
        from?: Hex;
        to?: Hex;
        nonce?: Quantity;
        chainId?: Quantity;
        data?: Hex;
        value?: Quantity;
        gasLimit?: Quantity;
        gasPrice?: Quantity;
        maxFeePerGas?: Quantity;
        maxPriorityFeePerGas?: Quantity;
    };
};

export type EvmCaip2ChainId = `eip155:${string}`;
export type Quantity = Hex | number;
export type Hex = `0x${string}`;

export interface Wallet {
    address: string;
    chainType: "ethereum" | "solana";
    chainId?: string;
    walletType?: string;
    walletClientType?: string;
    connectorType?: string;
    hdWalletIndex?: number;
    imported?: boolean;
    delegated?: boolean;
}
