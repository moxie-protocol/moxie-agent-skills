import { Staking } from "../types";

export interface DegenFansResponse<T> {
    status: number;
    message: string;
    data?: {
        result: T;
    };
}

export interface StakingOption {
    rank: number;
    channelAddress: string;
    name: string;
    roi: number;
    currentStake: number;
}

export interface StakingResult {
    stakingOptions: StakingOption[];
    userName?: string;
    userAddress?: string;
    matchType?: string;
    amount: number;
    amountRandom: boolean;
}

enum Method {
    GET = "GET",
    POST = "POST",
}

const degenfansApiBaseUrl =
    "https://degenfans.xyz/servlet/rest-services/main/af/v1";

async function callDfApi<T>(url: string, method: Method, body: string) {
    try {
        // Make the HTTP request using fetch
        let headers;
        if (Method.POST === method) {
            headers = {
                Accept: "application/json",
                "Content-Type": "application/json",
            };
        } else {
            headers = {
                Accept: "application/json",
            };
        }
        const response = await fetch(degenfansApiBaseUrl + url, {
            method,
            headers,
            body,
        });

        // Check if the response status is OK (status code 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the JSON response
        const apiData = (await response.json()) as DegenFansResponse<T>;

        return apiData; // Return the parsed data
    } catch (error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                status: 500,
            } as DegenFansResponse<null>;
        } else {
            return {
                message: "Unexpected error:",
                status: 500,
            } as DegenFansResponse<null>;
        }
        // You can also return null or a default value in case of an error
    }
}
function callPostDfApi<T>(url: string, body: string) {
    return callDfApi<T>(url, Method.POST, body);
}
function callGetDfApi<T>(url: string) {
    return callDfApi<T>(url, Method.GET, null);
}

export async function getStakingOptions(
    fid: string,
    xhandle: string,
    data: Staking
): Promise<DegenFansResponse<StakingResult | null>> {
    return callPostDfApi<StakingResult>(
        "/alfafrens-staking-consultant/?token=" + process.env.DEGENFANS_API,
        JSON.stringify({ fid, xhandle, staking: data })
    );
}
