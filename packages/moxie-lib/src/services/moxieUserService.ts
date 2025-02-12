import { elizaLogger } from "@moxie-protocol/core";

interface TwitterMetadata {
    username: string;
    name?: string;
    type?: string;
    subject?: string;
    verifiedAt?: string;
    firstVerifiedAt?: string;
    latestVerifiedAt?: string;
    profilePictureUrl?: string;
}

interface FarcasterMetadata {
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
    vestingContracts?: VestingContract[] | null;
}

export type VestingContract = {
    beneficiaryAddress: string;
    vestingContractAddress: string;
};

interface MeQueryResponse {
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

interface GetUserResponse {
    data: {
        GetUser: MoxieUser;
    };
}

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
            query GetUser($userId: String!, $vestingContractRequired: Boolean!) {
                GetUser(input: { userId: $userId, vestingContractRequired: $vestingContractRequired }) {
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
                    vestingContracts {
                        beneficiaryAddress
                        vestingContractAddress
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
                variables: { userId, vestingContractRequired: true },
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
                if (
                    identity.type === "TWITTER" &&
                    identity.dataSource == "PRIVY"
                ) {
                    twitterUsername = identity?.metadata?.username;
                } else if (
                    identity.type === "FARCASTER" &&
                    identity.dataSource == "PRIVY"
                ) {
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

// getTwitteruserNameByMoxieIdMultiple(["M4"]).then(console.log)

// getSocialProfilesByMoxieIdMultiple(["M4"]).then(console.log)

export async function getUserByPrivyBearerToken(
    bearerToken: string
): Promise<MoxieUser> {
    const query = `
        query Me {
            Me {
                id
                userName
                name
                bio
                profileImageUrl
                referralCode
                referrerId
                moxieScore
                moxieRank
                totalUsers
                primaryWalletId
                communicationPreference
                createdAt
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

    try {
        const response = await fetch(process.env.MOXIE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bearerToken,
            },
            body: JSON.stringify({
                query,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = (await response.json()) as MeQueryResponse;

        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        return result.data.Me;
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw error;
    }
}
