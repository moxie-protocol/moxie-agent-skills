import { z } from "zod";

export const TransferEthSchema = z.object({
    amount: z.number(),
    toAddress: z.string(),
});
