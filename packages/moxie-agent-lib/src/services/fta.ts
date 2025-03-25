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

interface FtaResponse {
    data: {
        GetFta: Fta;
    };
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

export async function getUserFtaData(moxieUserId: string): Promise<Fta> {
    const query = `
        query GetFta {
            GetFta(input: { moxie_user_id: "${moxieUserId}" }) {
                id
                entityId
                entityType
                entitySymbol
                status
                startTimestamp
                endTimestamp
                initialSupply
                entityDisplayName
                entityName
                entityImage
                subjectAddress
                allTimeEarnings
                earningsToday
                earningsThisWeek
                avgDailyEarnings
                followerCount
                followingCount
                launchCastUrl
                allTimeEarningRank
                auctionId
                userFansSharePercentage
                imageURL
                identityType
                moxieUserId
                isFeatured
                reserveRatio
                priceCurve
            }
        }
    `;

    try {
        const response = await fetch(
            process.env.AIRSTACK_BACKEND_GRAPHQL_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as FtaResponse;
        return data.data.GetFta;
    } catch (error) {
        console.error("Error fetching FTA data:", error);
        throw error;
    }
}

export async function getFTABySymbol(symbol: string): Promise<Fta | null> {
    const query = `
       query GetFta ($input: GetFtaInput!){
    GetFta(input: $input) {
                startTimestamp
                endTimestamp
                initialSupply
                entityDisplayName
                entityName
                entityImage
                subjectAddress
                allTimeEarnings
                earningsToday
                earningsThisWeek
                avgDailyEarnings
                followerCount
                followingCount
                launchCastUrl
                allTimeEarningRank
                auctionId
                userFansSharePercentage
                imageURL
                identityType
                moxieUserId
                isFeatured
                reserveRatio
                priceCurve
            }
        }
    `;

    try {
        const response = await fetch(
            process.env.AIRSTACK_BACKEND_GRAPHQL_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                    variables: {
                        input: {
                            entity_symbol: symbol,
                        },
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as FtaResponse;
        const ftas = data.data.GetFta;
        return ftas;
    } catch (error) {
        console.error("Error fetching FTA data by symbol:", error);
        throw error;
    }
}

export async function getFtaUserMapping(
    entitySymbols: string[]
): Promise<FtaUserMapping[]> {
    const query = `
        query GetFtas($entitySymbols: [String!]!) {
            GetFtas(
                input: {
                    filter: { entity_symbol: $entitySymbols },
                    orderBy: { followerCount: DESC }
                }
            ) {
                ftas {
                    moxieUserId
                    entitySymbol
                }
            }
        }
    `;

    try {
        const response = await fetch(
            process.env.AIRSTACK_BACKEND_GRAPHQL_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    query,
                    variables: { entitySymbols },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as FtaUserMappingResponse;

        // Return the `ftas` array
        return data.data.GetFtas.ftas;
    } catch (error) {
        console.error("Error fetching FTA user mapping data:", error);
        throw error;
    }
}
