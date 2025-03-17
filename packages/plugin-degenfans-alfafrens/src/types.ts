import { z } from "zod";


export interface Staking {
    amount: number,
    userAddress?: string,
    mysubs: boolean,
    mytake: boolean,
    minsubs?:number,
  }
  

export const StakingSchema = z.object({
    amount: z.number().min(1),
    userAddress: z.string().optional(),
    mysubs: z.boolean(),
    mytake: z.boolean(),
    minsubs: z.number().optional(),
});