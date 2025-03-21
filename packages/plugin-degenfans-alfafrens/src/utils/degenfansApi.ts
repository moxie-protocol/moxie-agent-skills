import { Staking } from "../types";


export interface DegenFansResponse<T>{
    status:number,
    message:string,
    data?:T
}


export interface StakingOption{
  rank:number,
  channelAddress:string,
  name:string,
  roi:number,
  currentStake:number,
}


const degenfansApiBaseUrl="https://degenfans.xyz/servlet/rest-services/main/af/v1";
 
  export function getStakingOptions(subjectAddress:string, data:Staking): Promise<DegenFansResponse<StakingOption[]>> {
    // For now, consider the data is stored on a static `users.json` file
    return fetch(degenfansApiBaseUrl+'/alfafrens-staking-consultant/?token='+process.env.DEGENFANS_API, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({subjectAddress, staking:data})
    } )
      // the JSON body is taken from the response
      .then(res => res.json())
      .then(res => {
        // The response has an `any` type, so we need to cast
        // it to the `User` type, and return it from the promise
        return res as DegenFansResponse<StakingOption[]>
      })
  }

