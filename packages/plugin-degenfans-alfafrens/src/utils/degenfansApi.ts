import { FarcasterMetadata, MoxieUser, TwitterMetadata } from "@moxie-protocol/moxie-agent-lib";
import { Staking } from "../types";


export interface DegenFansResponse<T> {
  status: number,
  message: string,
  data?: T
}

export interface StakingRequest {
  amount: number,
  mysubs: boolean,
  mystake: boolean,
  minsubs?:number,
}

export interface StakingOption {
  rank: number,
  channelAddress: string,
  name: string,
  roi: number,
  currentStake: number,
}
export interface AfUser{
  userName?: string,
  userAddress?: string,
  matchType?: string,
}
export interface AlfaFrensResult<T> {
  result:T,
  user?: AfUser
}

export interface StakingResult {
stakingOptions: StakingOption[],
amount: number,
amountRandom: boolean,
}

enum Method {
  GET = "GET",
  POST = "POST",
}

const degenfansApiBaseUrl = "https://degenfans.xyz/servlet/rest-services/main/af/v1";

async function callDfApi<T>(url: string, method: Method, body: string) {
  try {
    // Make the HTTP request using fetch
    let headers;
    if (Method.POST === method) {
      headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
    } else {
      headers = {
        'Accept': 'application/json'
      };
    }
    const response = await fetch(degenfansApiBaseUrl + url, {
      method,
      headers,
      body
    });

    // Check if the response status is OK (status code 200-299)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the JSON response
    const apiData = await response.json() as DegenFansResponse<T>;

    return apiData;  // Return the parsed data
  } catch (error) {

    if (error instanceof Error) {
      return { message: error.message, status: 500 } as DegenFansResponse<null>;
    } else {
      return { message: 'Unexpected error:', status: 500 } as DegenFansResponse<null>;
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

export function getHelpText(user: AfUser): string {
  let tbl = "";
  if (user && user.matchType) {
    if (user.matchType === "BY_CREATOR_COIN") {
      tbl += "\n* I matched your AlfaFrens user by your moxie creator coin FID";
    } else if (user.matchType === "BY_GIVEN_ADDRESS") {
      tbl += "\n* I matched your AlfaFrens user by your given AlfaFrens user address";
    } else if (user.matchType === "BY_GIVEN_NAME") {
      tbl += "\n* I matched your AlfaFrens user by your given AlfaFrens user name";
    } else if (user.matchType === "BY_FID") {
      tbl += "\n* I matched your AlfaFrens user by your moxie account FID";
    } else if (user.matchType === "BY_TWITTER") {
      tbl += "\n* I matched your AlfaFrens user by your moxie account X handle";
    }
  } else {
    tbl += "\n* I was not able to match your AlfaFrens profile, following options you have:";
    tbl += "\n   * AlfaFrens profile address";
    tbl += "\n   * AlfaFrens profile name";
    tbl += "\n   * conected Farcaster Account from your Moxie profile";
    tbl += "\n   * conected X Account from your Moxie profile";
    tbl += "\n";
    tbl += "\nif you don´t have any account on AlfaFrens, create one on:";
    tbl += "\nhttps://alfafrens.com";
    tbl += "\n\nElse, get in touch w/ @degenfans to resolve the issue";

  }
  return tbl
}

export interface UserData {
  fid: string, xhandle: string
}

export function getUserData(moxieUserInfo: MoxieUser): UserData {
  let fid: string = null;
  let xhandle: string = null;
  const fcId = moxieUserInfo.identities.find(o => o.type === 'FARCASTER');
  if (fcId) {
    fid = (fcId.metadata as FarcasterMetadata).profileTokenId;
  }

  const xId = moxieUserInfo.identities.find(o => o.type === 'TWITTER');
  if (xId) {
    xhandle = (fcId.metadata as TwitterMetadata).username;
  }

  return { fid, xhandle };
}

export async function getStakingOptions(user: UserData,userAddress:string, data: StakingRequest): Promise<DegenFansResponse<AlfaFrensResult<StakingResult> | null>> {
  return callPostDfApi<AlfaFrensResult<StakingResult>>('/alfafrens-staking-consultant/?token=' + process.env.DEGENFANS_API, JSON.stringify({ user,userAddress, staking: data }));
}


