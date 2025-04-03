import { z } from "zod";


export interface Staking {
    amount: number,
    userAddress?: string,
    mysubs: boolean,
    mystake: boolean,
    minsubs?:number,
  }
  

export const StakingSchema = z.object({
    amount: z.number().optional(),
    userAddress: z.string().optional(),
    mysubs: z.boolean(),
    mystake: z.boolean(),
    minsubs: z.number().optional(),
});


export interface GasUsage {
  userAddress?: string,
}


export const GasUsageSchema = z.object({
  userAddress: z.string().optional(),
});