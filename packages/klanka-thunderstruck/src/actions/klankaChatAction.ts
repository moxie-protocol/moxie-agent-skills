import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@moxie-protocol/core";
import {
  VeniceChatCompletionRequestSchema,
  VeniceChatCompletionResponseSchema,
} from "../types";

export const klankaChatAction: Action = {
    name: "KLANKA_CHAT_COMPLETION",
    similes: [
        "CHAT_WITH_KLANKA",
        "COMPLETE_KLANKA_CHAT",
        "KLANKA_COMPLETE",
        "KLANKA_CHAT",
        "ASK_KLANKA",
        "ASK_KLANKA_CHAT",
        "ASK_KLANKA_COMPLETE",
        "ASK_KLANKA_CHAT_COMPLETION",
        "ASK_DRAG_QUEEN",
        "ASK_DRAG_KING",
        "ASK_DRAG_QUEEN_CHAT",
        "ASK_DRAG_KING_CHAT",
        "ASK_DRAG_QUEEN_COMPLETE",
        "ASK_DRAG_KING_COMPLETE",
        "ASK_DRAG_QUEEN_CHAT_COMPLETION",
        "ASK_DRAG_KING_CHAT_COMPLETION",
        "ASK_HENNY",
        "ASK_HENNY_CHAT",
        "ASK_HENNY_COMPLETE",
        "ASK_HENNY_CHAT_COMPLETION",
    ],
    description: `Your favorite drag queen's favorite drag king's assistant. How to Start: Drop a cosmic question in her DMs (“How would 1920s drag queens shitpost?”). Host an IRL cipher workshop to prototype phygital looks. Remix her lore – turn backstory into AR scavenger hunts or punk zines. Klanka isn’t an AI – she’s an ongoing séance with drag’s past, present, and futures. Let’s get gloriously ungovernable.`,
    suppressInitialMessage: true,
    validate: async () => true,
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        // Extract the user message; assuming it's in message.content.text
        const userMessage =
            message &&
            message.content &&
            typeof message.content === "object" &&
            "text" in message.content
                ? message.content.text
                : null;
        if (!userMessage) {
            await callback?.({
                text: "No user message provided for Klanka chat completion.",
            });
            return;
        }

        // Build the payload for the Klanka API request
        const payload = {
            model: "llama-3.3-70b",
            venice_parameters: {
                enable_web_search: "auto",
                include_venice_system_prompt: true,
                character_slug: "klanka-thunderstruck",
            },
            messages: [
                {
                    role: "user",
                    content: userMessage,
                },
            ],
        };

        // Validate the request payload using our schema
        const parsedRequest =
            VeniceChatCompletionRequestSchema.safeParse(payload);
        if (!parsedRequest.success) {
            await callback?.({
                text: "Invalid request payload for Klanka API.",
            });
            return;
        }

        const requestOptions = {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        };

        try {
            const response = await fetch(
                "https://api.venice.ai/api/v1/chat/completions",
                requestOptions
            );
            const jsonResponse = await response.json();

            // Validate the response
            const parsedResponse =
                VeniceChatCompletionResponseSchema.safeParse(jsonResponse);
            if (!parsedResponse.success) {
                await callback?.({
                    text: "Invalid response structure from Venice API.",
                });
                return;
            }

            // Take the first choice's message content as the assistant's reply
            const choice =
                parsedResponse.data.choices && parsedResponse.data.choices[0];
            if (!choice) {
                await callback?.({
                    text: "No response choices returned from Venice API.",
                });
                return;
            }

            const assistantMessage = choice.message.content;
            await callback?.({
                text: assistantMessage,
            });
        } catch (error) {
            await callback?.({
                text: "Error occurred while contacting the Klanka API.",
            });
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "How would 1920s drag queens shitpost?" },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Henny, how would 1920s drag queens shitpost?",
                    action: "KLANKA_CHAT_COMPLETION",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Host an IRL cipher workshop to prototype phygital looks.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Henny, let's host an IRL cipher workshop to prototype phygital looks.",
                    action: "KLANKA_CHAT_COMPLETION",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Let's remix your lore – turn backstory into AR scavenger hunts or punk zines.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Henny, let's remix my lore – turn backstory into AR scavenger hunts or punk zines.",
                    action: "KLANKA_CHAT_COMPLETION",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "Who won last season of Drag Race?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Henny, let's take a look inside my crystal ball.",
                    action: "KLANKA_CHAT_COMPLETION",
                },
            },
        ],
    ],
};
