import { elizaLogger } from "@moxie-protocol/core";
import {
    Abi,
    Address,
    ContractFunctionParameters,
    createPublicClient,
    encodePacked,
    http,
    keccak256,
    namehash,
    stringToBytes,
} from "viem";
import { base, mainnet } from "viem/chains";
import { BasenameContractAbi, L2ResolverAbi } from "../constant";

export type Basename = `${string}.base.eth`;

export const BASENAME_L2_RESOLVER_ADDRESS =
    "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD";

export const BASENAME_CONTRACT_ADDRESS =
    "0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a";

export enum BasenameTextRecordKeys {
    Description = "description",
    Keywords = "keywords",
    Url = "url",
    Email = "email",
    Phone = "phone",
    Github = "com.github",
    Twitter = "com.twitter",
    Farcaster = "xyz.farcaster",
    Lens = "xyz.lens",
    Telegram = "org.telegram",
    Discord = "com.discord",
    Avatar = "avatar",
}

export const textRecordsKeysEnabled = [
    BasenameTextRecordKeys.Description,
    BasenameTextRecordKeys.Keywords,
    BasenameTextRecordKeys.Url,
    BasenameTextRecordKeys.Github,
    BasenameTextRecordKeys.Email,
    BasenameTextRecordKeys.Phone,
    BasenameTextRecordKeys.Twitter,
    BasenameTextRecordKeys.Farcaster,
    BasenameTextRecordKeys.Lens,
    BasenameTextRecordKeys.Telegram,
    BasenameTextRecordKeys.Discord,
    BasenameTextRecordKeys.Avatar,
];

const baseClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
});

export async function getBasenameAvatar(basename: Basename) {
    const avatar = await baseClient.getEnsAvatar({
        name: basename,
        universalResolverAddress: BASENAME_L2_RESOLVER_ADDRESS,
    });

    return avatar;
}

export function buildBasenameTextRecordContract(
    basename: Basename,
    key: BasenameTextRecordKeys
): ContractFunctionParameters {
    return {
        abi: L2ResolverAbi as Abi,
        address: BASENAME_L2_RESOLVER_ADDRESS,
        // @ts-expect-error: namehash returns a hex string
        args: [namehash(basename), key],
        functionName: "text",
    };
}

// Get a single TextRecord
export async function getBasenameTextRecord(
    basename: Basename,
    key: BasenameTextRecordKeys
) {
    try {
        const contractParameters = buildBasenameTextRecordContract(
            basename,
            key
        );
        const textRecord = await baseClient.readContract(contractParameters);
        return textRecord as string;
    } catch (error) {
        elizaLogger.error("Error in getBasenameTextRecord:", error);
    }
}

// Get a all TextRecords
export async function getBasenameTextRecords(basename: Basename) {
    try {
        const readContracts: ContractFunctionParameters[] =
            textRecordsKeysEnabled.map((key) =>
                buildBasenameTextRecordContract(basename, key)
            );
        const textRecords = await baseClient.multicall({
            contracts: readContracts,
        });

        return textRecords;
    } catch (error) {
        elizaLogger.error("Error in getBasenameTextRecords:", error);
    }
}

/**
 * Convert an chainId to a coinType hex for reverse chain resolution
 */
export const convertChainIdToCoinType = (chainId: number): string => {
    // L1 resolvers to addr
    if (chainId === mainnet.id) {
        return "addr";
    }

    const cointype = (0x80000000 | chainId) >>> 0;
    return cointype.toString(16).toLocaleUpperCase();
};

/**
 * Convert an address to a reverse node for ENS resolution
 */
export const convertReverseNodeToBytes = (
    address: Address,
    chainId: number
) => {
    const addressFormatted = address.toLocaleLowerCase() as Address;
    const addressNode = keccak256(addressFormatted.substring(2) as Address);
    const chainCoinType = convertChainIdToCoinType(chainId);
    const baseReverseNode = namehash(
        `${chainCoinType.toLocaleUpperCase()}.reverse`
    );
    const addressReverseNode = keccak256(
        encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
    );
    return addressReverseNode;
};

export async function getBasename(address: Address) {
    try {
        const addressReverseNode = convertReverseNodeToBytes(address, base.id);
        const basename = await baseClient.readContract({
            abi: L2ResolverAbi,
            address: BASENAME_L2_RESOLVER_ADDRESS,
            functionName: "name",
            args: [addressReverseNode],
        });
        if (basename) {
            return basename as Basename;
        }
    } catch (error) {
        elizaLogger.error("Error in getBasename:", error);
    }
}

export async function getBasenameExpiry(basename: Basename) {
    const name = basename.split(".")?.[0];
    const tokenId = BigInt(keccak256(stringToBytes(name)));
    elizaLogger.info("Token ID:", basename, namehash(basename), tokenId);
    const expiry = await baseClient.readContract({
        abi: BasenameContractAbi,
        address: BASENAME_CONTRACT_ADDRESS,
        functionName: "nameExpires",
        args: [tokenId],
    });
    return expiry;
}
