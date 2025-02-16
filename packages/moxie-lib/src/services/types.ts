import type { Wallet as PrivyWallet } from "@privy-io/server-auth";

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

export interface FarcasterMetadata {
    bio: string;
    username: string;
    displayName: string;
    profileTokenId: string;
}

export interface MoxieIdentity {
    id: string;
    userId: string;
    type: string;
    dataSource: string;
    connectedIdentitiesFetchStatus: string;
    metadata: TwitterMetadata | FarcasterMetadata;
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
    bio?: string;
    profileImageUrl?: string;
    referralCode: string;
    referrerId?: string;
    moxieScore?: number;
    moxieRank?: number;
    totalUsers?: number;
    primaryWalletId?: string;
    communicationPreference?: string;
    createdAt: string;
    identities: MoxieIdentity[];
    wallets: MoxieWallet[];
}

export interface MeQueryResponse {
    data: {
        Me: MoxieUser;
    };
    errors?: Array<{
        message: string;
        locations?: Array<{
            line: number;
            column: number;
        }>;
    }>;
}

export interface GetUserResponse {
    data: {
        GetUser: MoxieUser;
    };
}

export type GetWalletDetailsOutput = {
    success: boolean;
    privyId: string;
    wallet: undefined | PrivyWallet;
};

export interface SignMessageInput {
    message: string;
    address: string;
}

export interface SignMessageResponse {
    signature: string;
    encoding: string;
}

export type SignTransactionInput = {
    from?: string;
    to?: string;
    nonce?: number;
    chainId?: number;
    data?: string;
    value?: string;
    type?: number;
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    address?: string;
};

export interface SignTransactionResponse {
    signature: string;
    encoding: string;
}

export type SignTypedDataInput = {
    domain: Record<string, any>;
    types: Record<string, any>;
    message: Record<string, any>;
    primaryType: string;
    address: string;
};

export interface SignTypedDataResponse {
    signature: string;
    encoding: string;
}

export interface SendTransactionResponse {
    hash: string;
    caip2?: string;
    code?: string;
    message?: string;
}

export interface SendTransactionInput extends SignTransactionInput {
    caip2?: string;
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
