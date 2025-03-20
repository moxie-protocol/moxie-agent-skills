import { z } from "zod";

export const TransferEthSchema = z.object({
    amount: z.number().min(0),
    toAddress: z.string(),
    isENS: z.boolean(),
});

/* Venice chat completion types */
export const VeniceChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  reasoning_content: z.string().nullable().optional(),
  tool_calls: z.array(z.any()).optional(),
});

export const VeniceParametersSchema = z.object({
  enable_web_search: z.string(),
  include_venice_system_prompt: z.boolean(),
  character_slug: z.string(),
});

export const VeniceChatCompletionRequestSchema = z.object({
  model: z.string(),
  venice_parameters: VeniceParametersSchema,
  messages: z.array(VeniceChatMessageSchema),
});

export const VeniceChatCompletionResponseSchema = z.object({
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: VeniceChatMessageSchema,
    logprobs: z.any().nullable(),
    finish_reason: z.string().nullable(),
    stop_reason: z.string().nullable(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    total_tokens: z.number(),
    completion_tokens: z.number(),
    prompt_tokens_details: z.any().nullable(),
  }),
  prompt_logprobs: z.any().nullable(),
  venice_parameters: z.object({
    web_search_citations: z.array(z.object({
      title: z.string(),
      url: z.string(),
      date: z.string(),
      content: z.string(),
    })),
  }),
});
