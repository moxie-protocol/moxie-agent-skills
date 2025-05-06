import type { UUID, Character } from "@senpi-ai/core";

const BASE_URL = "http://localhost:3000";

const fetcher = async ({
    url,
    method,
    body,
    headers,
}: {
    url: string;
    method?: "GET" | "POST";
    body?: object | FormData;
    headers?: HeadersInit;
}) => {
    const options: RequestInit = {
        method: method ?? "GET",
        headers: headers
            ? headers
            : {
                  Accept: "application/json",
                  "Content-Type": "application/json",
              },
    };

    if (method === "POST") {
        if (body instanceof FormData) {
            // @ts-expect-error - Supressing potentially undefined options header
            delete options.headers["Content-Type"];
            options.body = body;
        } else {
            options.body = JSON.stringify(body);
        }
    }

    return fetch(`${BASE_URL}${url}`, options).then(async (resp) => {
        if (resp.ok) {
            const contentType = resp.headers.get("Content-Type");

            if (contentType === "audio/mpeg") {
                return await resp.blob();
            }
            return resp.json();
        }

        const errorText = await resp.text();
        console.error("Error: ", errorText);

        let errorMessage = "An error occurred.";
        try {
            const errorObj = JSON.parse(errorText);
            errorMessage = errorObj.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
    });
};

export const apiClient = {
    sendMessage: (
        agentId: string,
        message: string,
        selectedFile?: File | null
    ) => {
        const formData = new FormData();
        formData.append("text", message);
        formData.append("user", "user");
        formData.append("roomId", agentId);

        if (selectedFile) {
            formData.append("file", selectedFile);
        }
        return fetch(`${BASE_URL}/${agentId}/message`, {
            method: "POST",
            body: formData,
        }).then(async (resp) => {
            if (resp.ok) {
                const contentType = resp.headers.get("Content-Type");

                if (contentType === "audio/mpeg") {
                    return await resp.blob();
                }
                if (contentType?.includes("text/event-stream")) {
                    const reader = resp.body?.getReader();
                    const decoder = new TextDecoder();

                    return {
                        stream: true,
                        async *[Symbol.asyncIterator]() {
                            while (true) {
                                const { done, value } = await reader!.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                // Match all JSON objects in the chunk
                                const matches = chunk.match(/{[^}]+}/g);

                                if (matches) {
                                    for (const jsonStr of matches) {
                                        try {
                                            const data = JSON.parse(jsonStr);
                                            yield data;
                                        } catch (error) {
                                            console.error(
                                                "Failed to parse JSON:",
                                                jsonStr
                                            );
                                            const errorMessage =
                                                error instanceof Error
                                                    ? error.message
                                                    : "Failed to parse JSON";
                                            throw new Error(errorMessage);
                                        }
                                    }
                                }
                            }
                        },
                    };
                }
                return resp.json();
            }

            const errorText = await resp.text();
            console.error("Error: ", errorText);

            let errorMessage = "An error occurred.";
            try {
                const errorObj = JSON.parse(errorText);
                errorMessage = errorObj.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            throw new Error(errorMessage);
        });
    },
    getAgents: () => fetcher({ url: "/agents" }),
    getAgent: (agentId: string): Promise<{ id: UUID; character: Character }> =>
        fetcher({ url: `/agents/${agentId}` }),
    tts: (agentId: string, text: string) =>
        fetcher({
            url: `/${agentId}/tts`,
            method: "POST",
            body: {
                text,
            },
            headers: {
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
                "Transfer-Encoding": "chunked",
            },
        }),
    whisper: async (agentId: string, audioBlob: Blob) => {
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.wav");
        return fetcher({
            url: `/${agentId}/whisper`,
            method: "POST",
            body: formData,
        });
    },
};
