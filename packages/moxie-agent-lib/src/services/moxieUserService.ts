import { elizaLogger } from "@moxie-protocol/core";
import { mockMoxieUser } from "../constants/constants";
import type { MoxieUser, MoxieIdentity } from "./types";

export async function getUserMoxieWalletAddress(
    walletAddress: string
): Promise<MoxieUser | undefined> {
    return (
        mockMoxieUser.wallets.find(
            (wallet) => wallet.walletAddress === walletAddress
        ) && Promise.resolve(mockMoxieUser)
    );
}

export async function getUserByMoxieId(
    userId: string
): Promise<MoxieUser | undefined> {
    return userId === mockMoxieUser.id && Promise.resolve(mockMoxieUser);
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
