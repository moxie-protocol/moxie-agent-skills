import { Fta } from "./fta";
import { SenpiUser } from "./types";
import { SenpiClientWalet } from "../wallet";
import { Portfolio, PortfolioV2Data } from "./zapperService";

/**
 * REUSABLE MOCK DATA STARTS BELOW
 */

// Mock Senpi User Data
export const mockSenpiUser: SenpiUser = {
    id: "M1",
    userName: "vitalik.eth",
    name: "vitalik.eth",
    bio: null,
    profileImageUrl: "https://i.imgur.com/Y1au7ZB.jpg",
    referralCode: "TTg=",
    referrerId: "M12",
    communicationPreference: "WARPCAST",
    primaryWalletId: "03463334-3c5c-4d08-9551-188f62b2586a",
    senpiScore: 1000,
    senpiRank: 0,
    createdAt: "2024-12-20T14:37:34.348Z",
    identities: [
        {
            id: "fd14e2a4-11a2-4115-81b4-4b1d266ade64",
            userId: "M1",
            type: "FARCASTER",
            connectedIdentitiesFetchStatus: "SUCCESS",
            metadata: {
                bio: "hullo",
                username: "vitalik.eth",
                displayName: "Vitalik Buterin",
                fid: 15971,
                pfp: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfC2vsceENh7G_Q-hg6Ju6YwVYqn6f_VXsMA&s",
                type: "farcaster",
                verifiedAt: "2025-02-03T06:50:41.000Z",
                ownerAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                firstVerifiedAt: "2025-02-03T06:50:41.000Z",
                latestVerifiedAt: "2025-02-03T06:50:41.000Z",
            },
            profileId: "5650",
            isActive: true,
            createdAt: "2025-01-07T12:12:05.833Z",
            updatedAt: "2025-01-07T12:12:05.833Z",
            dataSource: "PRIVY",
        },
        {
            id: "060e2d06-6fc4-45f8-8d51-3014a8406684",
            userId: "M1",
            type: "TWITTER",
            connectedIdentitiesFetchStatus: "SUCCESS",
            metadata: {
                name: "vitalik.eth",
                type: "twitter_oauth",
                subject: "2893777598",
                username: "VitalikButerin",
                verifiedAt: "2025-01-06T19:28:06.000Z",
                firstVerifiedAt: "2025-01-06T19:28:06.000Z",
                latestVerifiedAt: "2025-01-06T19:28:06.000Z",
                profilePictureUrl:
                    "https://pbs.twimg.com/profile_images/1880759276169224192/rXpjZO0A_400x400.jpg",
            },
            profileId: "VitalikButerin",
            isActive: true,
            createdAt: "2025-01-07T12:12:05.833Z",
            updatedAt: "2025-01-07T12:12:05.833Z",
            dataSource: "PRIVY",
        },
    ],
    wallets: [
        {
            id: "03463334-3c5c-4d08-9551-188f62b2586a",
            userId: "M1",
            walletAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            walletType: "injected",
            createdAt: "2025-01-07T12:12:05.852Z",
            deletedAt: null,
            dataSource: "PRIVY",
        },
        {
            id: "ef43dedc-9b17-49e0-93bf-94359d47f061",
            userId: "M1",
            walletAddress: "0xa5cc845ef113c4c0908d4c1f4616a000b9a67b80",
            walletType: "embedded",
            createdAt: "2025-01-07T12:12:05.852Z",
            deletedAt: null,
            dataSource: "PRIVY",
        },
    ],
    vestingContracts: [],
};

// Mock Senpi Wallet Data
export const mockWallet: SenpiClientWalet = {
    address: "0xa5cc845ef113c4c0908d4c1f4616a000b9a67b80",
    chainType: "ethereum",
    chainId: "8453",
    walletType: "embedded",
    walletClientType: "privy",
    connectorType: "embedded",
    hdWalletIndex: 0,
    delegated: false,
};

export const mockFta: Fta = {
    id: "1",
    status: "COMPLETED",
    entityId: "5650",
    auctionId: "1",
    entityType: "USER",
    entityName: "vitalik.eth",
    entityImage:
        "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/341d47e1-f746-4f5c-8fbe-d9e56fa66100/original",
    endTimestamp: "2024-11-21T09:23:13Z",
    entitySymbol: "fid:5650",
    initialSupply: 172,
    followerCount: 1515,
    followingCount: 681,
    subjectAddress: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    startTimestamp: "2024-11-18T09:23:29Z",
    earningsThisWeek: 1000,
    allTimeEarnings: 10000,
    earningsToday: null,
    avgDailyEarnings: 1000,
    entityDisplayName: "Vitalik Buterin",
    allTimeEarningRank: 1,
    userFansSharePercentage: 90,
    senpiUserId: "M1",
    imageURL: null,
    priceCurve: 0,
    launchCastUrl: null,
    identityType: null,
    isFeatured: false,
    reserveRatio: 400000,
};

export const mockPortfolio: Portfolio = {
    tokenBalances: [
        {
            address: "0x0000000000000000000000000000000000000000",
            network: "BASE_MAINNET",
            token: {
                balance: 1000000000000000000,
                balanceUSD: 1000000000000000000,
                baseToken: {
                    name: "ETH",
                    address: "0x0000000000000000000000000000000000000000",
                    symbol: "ETH",
                },
            },
        },
    ],
};

export const mockPortfolioV2: PortfolioV2Data = {
    tokenBalances: {
        totalBalanceUSD: 1000000000000000000,
        byToken: {
            edges: [
                {
                    cursor: "1",
                    node: {
                        id: "1",
                        tokenAddress:
                            "0x0000000000000000000000000000000000000000",
                        name: "ETH",
                        symbol: "ETH",
                        price: 1000000000000000000,
                        balance: 1000000000000000000,
                        balanceUSD: 1000000000000000000,
                        holdingPercentage: 100,
                        imgUrl: "https://senpi.ai/images/svg/senpi-bot.svg",
                    },
                },
            ],
        },
    },
    metadata: {
        addresses: ["0x0000000000000000000000000000000000000000"],
        networks: ["BASE_MAINNET"],
    },
};

export const SENPI_USER_PORTFOLIOS_QUERY = (filterConditions: string[]) => `
      query GetPortfolioInfo {
        MoxieUserPortfolios(
          input: {filter: {${filterConditions.join(", ")}}}
        ) {
          MoxieUserPortfolio {
            fanTokenSymbol
            fanTokenName
            fanTokenAddress
            totalLockedAmount
            totalUnlockedAmount
            totalTvl
            walletAddresses
            currentPrice
            lockedTvl
            unlockedTvl
          }
        }
      }
    `;
