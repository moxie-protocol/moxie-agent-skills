import { gql, GraphQLClient } from "graphql-request";

const graphQLClient = new GraphQLClient(
    `https://api.studio.thegraph.com/query/23537/senpi_protocol_minimal_mainnet/version/latest`
);

const query = gql`
    query MyQuery($user_addresses: [String!]) {
        portfolios(
            where: {
                user_in: $user_addresses
                subjectToken_: { symbol: "fid:385955" }
            }
        ) {
            balance
        }
    }
`;

interface Portfolio {
    balance: number;
}

interface GraphQLResponse {
    portfolios: Portfolio[];
}

export async function checkDegenFansCoins(wallets: string[]): Promise<number> {
    try {
        const { portfolios } = await graphQLClient.request<GraphQLResponse>(
            query,
            {
                user_addresses: wallets,
            }
        );

        const ret = portfolios.reduce(
            (acc, curr) => acc + Number(curr.balance) / 1e18,
            0
        );

        return ret;
    } catch (e) {
        throw new Error(e);
    }
}
