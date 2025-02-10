import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import {
    type AgentRuntime,
    elizaLogger,
    messageCompletionFooter,
    type IDatabaseAdapter,
} from "@elizaos/core";
import { createMoxieApiRouter } from "./moxieApis.ts";

export const messageHandlerTemplate =
    // {{goals}}
    // "# Action Examples" is already included
    `
    You are an AI assistant specialized in understanding cryptocurrency transaction intents. Follow these instructions IN ORDER to process the LATEST message from the conversation:

STEP 0: FOLLOWUP CHECK
- Check if the latest user message is a followup to your previous response
- Indicators of followup:
  1. User directly answers a prompt_message from your previous error response
  2. User provides missing fields you previously requested
  3. User confirms or denies a confirmation_message you sent
- If it's a followup:
  - Combine the new information with the previous transaction details
  - Only request remaining missing fields
  - Preserve the original action and transaction_type
- If it's not a followup:
  - Process as a new transaction request
  - Clear any previous context

STEP 1: MESSAGE EXTRACTION
- Only process the most recent message from "# Conversation Messages" that was provided by user. exclude ai responses.
- Identify the core intent
- For followups, maintain the original intent

    {{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter;

export class MoxieClient {
    public app: express.Application;
    private agents: Map<string, AgentRuntime>; // container management
    private server: any; // Store server instance
    public startAgent: Function; // Store startAgent functor
    public db: IDatabaseAdapter;

    constructor(db: IDatabaseAdapter) {
        elizaLogger.log("MoxieClient constructor");
        this.app = express();
        this.app.use(cors());
        this.agents = new Map();
        this.db = db;

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        const moxieApiRouter = createMoxieApiRouter(this.agents, this);
        this.app.use(moxieApiRouter);
    }

    // agent/src/index.ts:startAgent calls this
    public registerAgent(runtime: AgentRuntime) {
        // register any plugin endpoints?
        // but once and only once
        this.agents.set(runtime.agentId, runtime);
    }

    public unregisterAgent(runtime: AgentRuntime) {
        this.agents.delete(runtime.agentId);
    }

    public start(port: number) {
        this.server = this.app.listen(port, () => {
            elizaLogger.success(
                `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
            );
        });

        // Handle graceful shutdown
        const gracefulShutdown = () => {
            elizaLogger.log("Received shutdown signal, closing server...");
            this.server.close(() => {
                elizaLogger.success("Server closed successfully");
                process.exit(0);
            });

            // Force close after 5 seconds if server hasn't closed
            setTimeout(() => {
                elizaLogger.error(
                    "Could not close connections in time, forcefully shutting down"
                );
                process.exit(1);
            }, 5000);
        };

        // Handle different shutdown signals
        process.on("SIGTERM", gracefulShutdown);
        process.on("SIGINT", gracefulShutdown);
    }

    public stop() {
        if (this.server) {
            this.server.close(() => {
                elizaLogger.success("Server stopped");
            });
        }
    }
}
