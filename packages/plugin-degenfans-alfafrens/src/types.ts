import { z } from "zod";

export const StakingSchema = z.object({
    amount: z.number().min(0),
    userAddress: z.string().optional(),
    mysubs: z.boolean(),
    mytake: z.boolean(),
});