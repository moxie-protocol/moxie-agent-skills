import { elizaLogger } from "@moxie-protocol/core";
import type {
    MoxieUser,
    GetUserResponse,
    MeQueryResponse,
    MoxieIdentity,
    SignMessageResponse,
    SignMessageInput,
    SignTransactionInput,
    SignTransactionResponse,
    SignTypedDataInput,
    SignTypedDataResponse,
    SendTransactionInput,
    SendTransactionResponse,
    GetWalletDetailsOutput,
} from "./types";

export async function getUserMoxieWalletAddress(
    walletAddress: string
): Promise<MoxieUser | undefined> {
    try {
        const query = `
            query GetUser($walletAddress: String!) {
                GetUser(input: { walletAddress: $walletAddress }) {
                    id
                    userName
                    identities {
                        id
                        userId
                        type
                        dataSource
                        connectedIdentitiesFetchStatus
                        metadata
                        profileId
                        isActive
                        createdAt
                        updatedAt
                    }
                    wallets {
                        id
                        userId
                        walletAddress
                        walletType
                        dataSource
                        createdAt
                        deletedAt
                    }
                }
            }
        `;

        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: { walletAddress },
            }),
        });

        if (!response.ok) {
            elizaLogger.error(`HTTP error! status: ${response.status}`);
            return undefined;
        }

        const result = await response.json();

        if (!result.data) {
            elizaLogger.error(
                `No data in response for walletAddress ${walletAddress}:`,
                result
            );
            return undefined;
        }

        if (!result.data.GetUser) {
            elizaLogger.error(
                `No user found for walletAddress ${walletAddress}`
            );
            return undefined;
        }

        return result.data.GetUser;
    } catch (error) {
        elizaLogger.error("Error in getUserMoxieWalletAddress:", error);
        return undefined;
    }
}

export async function getUserByMoxieId(
    userId: string
): Promise<MoxieUser | undefined> {
    try {
        const query = `
            query GetUser($userId: String!) {
                GetUser(input: { userId: $userId }) {
                    id
                    userName
                    identities {
                        id
                        userId
                        type
                        dataSource
                        connectedIdentitiesFetchStatus
                        metadata
                        profileId
                        isActive
                        createdAt
                        updatedAt
                    }
                    wallets {
                        id
                        userId
                        walletAddress
                        walletType
                        dataSource
                        createdAt
                        deletedAt
                    }
                }
            }
        `;

        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: { userId },
            }),
        });

        const { data } = (await response.json()) as GetUserResponse;
        return data.GetUser;
    } catch (error) {
        elizaLogger.error("Error in getUserByMoxieId:", error);
        return undefined;
    }
}

export async function getUserByMoxieIdMultiple(
    userIds: string[]
): Promise<Map<string, MoxieUser>> {
    try {
        const results = await Promise.all(
            userIds.map((userId) => getUserByMoxieId(userId))
        );

        const userIdToTUser = new Map<string, MoxieUser>();

        userIds.forEach((userId, index) => {
            const user = results[index];

            if (user) {
                userIdToTUser.set(userId, user);
            }
        });

        elizaLogger.info(`results: ${userIdToTUser.size}`);

        return userIdToTUser;
    } catch (error) {
        elizaLogger.error("Error in getUserByMoxieIdMultiple:", error);
        return new Map();
    }
}

export async function getUserByWalletAddressMultiple(
    walletAddresses: string[]
): Promise<Map<string, MoxieUser>> {
    try {
        const results = await Promise.all(
            walletAddresses.map((walletAddress) =>
                getUserMoxieWalletAddress(walletAddress)
            )
        );

        const walletAddressToUser = new Map<string, MoxieUser>();

        walletAddresses.forEach((walletAddress, index) => {
            const user = results[index];

            if (user) {
                walletAddressToUser.set(walletAddress, user);
            }
        });

        elizaLogger.info(`results: ${walletAddressToUser.size}`);

        return walletAddressToUser;
    } catch (error) {
        elizaLogger.error("Error in getUserByWalletAddressMultiple:", error);
        return new Map();
    }
}

export async function getTwitteruserNameByMoxieIdMultiple(
    userIds: string[]
): Promise<Map<string, string>> {
    const userIdToTwitterUsername = new Map<string, string>();

    try {
        const results = await getUserByMoxieIdMultiple(userIds);

        userIds.forEach((userId, index) => {
            const user = results.get(userId);

            const twitterIdentity = user?.identities?.find(
                (identity: MoxieIdentity) => identity.type === "TWITTER"
            );

            const userName = twitterIdentity?.metadata?.username;

            if (userName) {
                userIdToTwitterUsername.set(userId, userName);
            }
        });

        return userIdToTwitterUsername;
    } catch (error) {
        elizaLogger.error(
            "Error in getTwitteruserNameByMoxieIdMultiple:",
            error
        );
    }

    return userIdToTwitterUsername;
}

export interface SocialProfile {
    twitterUsername?: string;
    farcasterUsername?: string;
    farcasterUserId?: string;
}

export async function getSocialProfilesByMoxieIdMultiple(userIds: string[]) {
    const userIdToSocialProfile = new Map<string, SocialProfile>();

    try {
        const results = await getUserByMoxieIdMultiple(userIds);

        userIds.forEach((userId, _index) => {
            const user = results.get(userId);
            let twitterUsername = null;
            let farcasterUsername = null;
            let farcasterUserId = null;

            const identities = user?.identities || [];

            for (const identity of identities) {
                if (identity.type === "TWITTER") {
                    twitterUsername = identity?.metadata?.username;
                } else if (identity.type === "FARCASTER") {
                    console.log({ Metadata: JSON.stringify(identity) });
                    farcasterUsername = identity?.metadata?.username;
                    farcasterUserId = identity?.profileId;
                }
            }
            const socialProfile: SocialProfile = {
                twitterUsername: twitterUsername,
                farcasterUsername: farcasterUsername,
                farcasterUserId,
            };

            userIdToSocialProfile.set(userId, socialProfile);
        });

        return userIdToSocialProfile;
    } catch (error) {
        elizaLogger.error(
            "Error in getTwitteruserNameByMoxieIdMultiple:",
            error
        );
    }
}

export async function GetWalletDetails(
    bearerToken: string
): Promise<GetWalletDetailsOutput> {
    const query = `
query GetWalletDetails {
  GetWalletDetails {
    privyId
    success
    wallet {
      address
      chainId
      chainType
      connectorType
      hdWalletIndex
      delegated
      imported
      walletClientType
      walletType
    }
  }
  }
  `;
    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({ query }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as {
            data?: {
                GetWalletDetails: GetWalletDetailsOutput;
            };
            errors?: Array<{
                message: string;
                path?: string[];
                extensions?: Record<string, any>;
            }>;
        };

        if (data.errors?.length) {
            const error = data.errors[0];
            const errorMessage = error.message;
            const errorPath = error.path?.join(".") || "unknown path";
            throw new Error(`GraphQL error at ${errorPath}: ${errorMessage}`);
        }

        if (!data.data) {
            throw new Error("No data returned from API");
        }

        return data.data.GetWalletDetails;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to get wallet details: ${error.message}`);
        }
        throw new Error(
            "Failed to get wallet details: An unknown error occurred"
        );
    }
}

export async function SignMessage(
    input: SignMessageInput,
    bearerToken: string
): Promise<SignMessageResponse> {
    const query = `
    query SignMessage($input: EthereumSignMessageInput!) {
      SignMessage(input: $input) {
        signature
        encoding
      }
    }
  `;
    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({
                query,
                variables: { input },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as {
            data: SignMessageResponse;
            errors?: Array<{
                message: string;
                path?: string[];
                extensions?: Record<string, any>;
            }>;
        };

        if (data.errors?.length) {
            const error = data.errors[0];
            const errorMessage = error.message;
            const errorPath = error.path?.join(".") || "unknown path";
            throw new Error(`GraphQL error at ${errorPath}: ${errorMessage}`);
        }

        if (!data.data) {
            throw new Error("No data returned from API");
        }

        return data.data;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to sign message: ${error.message}`);
        }
        throw new Error("Failed to sign message: An unknown error occurred");
    }
}

export async function SignTransaction(
    input: SignTransactionInput
): Promise<SignTransactionResponse> {
    const query = `
    query SignTransaction($input: EthereumSignTransactionInput!) {
      SignTransaction(input: $input) {
        signature
        encoding
      }
    }
  `;
    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: { input },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as {
            data: {
                SignTransaction: SignTransactionResponse;
            };
            errors?: Array<{
                message: string;
                path?: string[];
                extensions?: Record<string, any>;
            }>;
        };

        if (data.errors?.length) {
            const error = data.errors[0];
            const errorMessage = error.message;
            const errorPath = error.path?.join(".") || "unknown path";
            throw new Error(`GraphQL error at ${errorPath}: ${errorMessage}`);
        }

        if (!data.data) {
            throw new Error("No data returned from API");
        }

        return data.data.SignTransaction;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to sign transaction: ${error.message}`);
        }
        throw new Error(
            "Failed to sign transaction: An unknown error occurred"
        );
    }
}

export async function SignTypedData(
    input: SignTypedDataInput,
    bearerToken: string
): Promise<SignTypedDataResponse> {
    const query = `
    query SignTypedData($input: EthereumSignTypedDataInput!) {
      SignTypedData(input: $input) {
        signature
        encoding
      }
    }
  `;
    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({
                query,
                variables: { input },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as {
            data: {
                SignTypedData: SignTypedDataResponse;
            };
            errors?: Array<{
                message: string;
                path?: string[];
                extensions?: Record<string, any>;
            }>;
        };

        if (data.errors?.length) {
            const error = data.errors[0];
            const errorMessage = error.message;
            const errorPath = error.path?.join(".") || "unknown path";
            throw new Error(`GraphQL error at ${errorPath}: ${errorMessage}`);
        }

        if (!data.data) {
            throw new Error("No data returned from API");
        }

        return data.data.SignTypedData;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to sign typed data: ${error.message}`);
        }
        throw new Error("Failed to sign typed data: An unknown error occurred");
    }
}

export async function sendTransaction(
    input: SendTransactionInput,
    bearerToken: string
): Promise<SendTransactionResponse> {
    const query = `
    query SendTransaction($input: EthereumSendTransactionInput!) {
      SendTransaction(input: $input) {
        hash
        caip2
        code
        message
      }
    }
  `;
    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({
                query,
                variables: { input },
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as {
            data: {
                SendTransaction: SendTransactionResponse;
            };
            errors?: Array<{
                message: string;
                path?: string[];
                extensions?: Record<string, any>;
            }>;
        };

        if (data.errors?.length) {
            const error = data.errors[0];
            const errorMessage = error.message;
            const errorPath = error.path?.join(".") || "unknown path";
            throw new Error(`GraphQL error at ${errorPath}: ${errorMessage}`);
        }

        if (!data.data) {
            throw new Error("No data returned from API");
        }

        return data.data.SendTransaction;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to send transaction: ${error.message}`);
        }
        throw new Error(
            "Failed to send transaction: An unknown error occurred"
        );
    }
}
