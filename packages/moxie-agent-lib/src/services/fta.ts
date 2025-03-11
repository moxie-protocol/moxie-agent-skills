import { mockFta } from "../constants/constants";

export interface Fta {
    id: string;
    entityId: string;
    entityType: string;
    entitySymbol: string;
    status: string;
    startTimestamp: string;
    endTimestamp: string;
    initialSupply: number;
    entityDisplayName: string;
    entityName: string;
    entityImage: string;
    subjectAddress: string;
    allTimeEarnings: number;
    earningsToday: number;
    earningsThisWeek: number;
    avgDailyEarnings: number;
    followerCount: number;
    followingCount: number;
    launchCastUrl: string;
    allTimeEarningRank: number;
    auctionId: string;
    userFansSharePercentage: number;
    imageURL: string;
    identityType: string;
    moxieUserId: string;
    isFeatured: boolean;
    reserveRatio: number;
    priceCurve: number;
}

export interface FtaUserMapping {
    entitySymbol: string;
    moxieUserId: string;
}

interface FtaUserMappingResponse {
    data: {
        GetFtas: {
            ftas: FtaUserMapping[];
        };
    };
}

interface FtaUserMappingResponse {
    data: {
        GetFtas: {
            ftas: FtaUserMapping[];
        };
    };
}

export async function getUserFtaData(moxieUserId: string): Promise<Fta | null> {
    return Promise.resolve(
        mockFta.moxieUserId === moxieUserId ? mockFta : null
    );
}

export async function getFTABySymbol(symbol: string): Promise<Fta | null> {
    return Promise.resolve(mockFta.entitySymbol === symbol ? mockFta : null);
}

export async function getFtaUserMapping(
    entitySymbols: string[]
): Promise<FtaUserMapping[]> {
    return Promise.resolve(
        entitySymbols
            .map((symbol) => {
                if (symbol === mockFta.entitySymbol) {
                    return {
                        entitySymbol: symbol,
                        moxieUserId: mockFta.moxieUserId,
                    };
                }
                return null;
            })
            .filter(Boolean)
    );
}
