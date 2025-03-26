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
 
  export async function getStakingOptions(fid:number, xhandle:string, data:Staking): Promise<DegenFansResponse<StakingOption[] | null>> {
 
      try {
        // Make the HTTP request using fetch
        const response = await fetch(degenfansApiBaseUrl+'/alfafrens-staking-consultant/?token='+process.env.DEGENFANS_API, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({fid, xhandle, staking:data})
        } );
    
        // Check if the response status is OK (status code 200-299)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
    
        // Parse the JSON response
        const apiData = await response.json() as DegenFansResponse<StakingOption[]>;
        
        return apiData;  // Return the parsed data
      } catch (error) {
   
        if (error instanceof Error) {
          return {message:error.message, status:500} as DegenFansResponse<null>;
        } else {
          return {message:'Unexpected error:', status:500} as DegenFansResponse<null>;
        }
        // You can also return null or a default value in case of an error
    
      }
  }

