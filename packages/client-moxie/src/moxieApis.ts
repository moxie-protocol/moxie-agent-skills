import { auth } from "./middleware/auth";
import bodyParser, { text } from "body-parser";
import cors from "cors";
import {
    Account,
    Client,
    DatabaseAdapter,
    IAgentRuntime,
    UUID,
    validateCharacterConfig,
    validateUuid,
} from "@elizaos/core";

import {
    AgentRuntime,
    composeContext,
    elizaLogger,
    generateMessageResponse,
    getEmbeddingZeroVector,
    getEnvVariable,
    Media,
    Memory,
    ModelClass,
} from "@elizaos/core";

import { MoxieClient, messageHandlerTemplate } from ".";
import { stringToUuid } from "@elizaos/core";
import { Content } from "@elizaos/core";
import { UserAgentInfo, UserAgentInteraction } from "./types/types.ts";
import {
    MINIMUM_CREATOR_AGENT_COINS,
    COMMON_AGENT_ID,
} from "./constants/constants";
import { privyClient } from "./lib/privy";
import { Wallet } from "@privy-io/server-auth";
import {
    validateCreatorAgentCoinBalance,
    validateInputAgentInteractions,
} from "./helpers";
import express, { Request, Response } from "express";
import { ResponseHelper } from "./responseHelper.ts";
import { traceIdMiddleware } from "./middleware/traceId.ts";
import { ftaService, moxieUserService } from "@elizaos/moxie-lib";
import { MoxieUser } from "@elizaos/moxie-lib";

interface UUIDParams {
    agentId: UUID;
    roomId?: UUID;
}

function validateUUIDParams(
    params: { agentId: string; roomId?: string },
    res: express.Response
): UUIDParams | null {
    const agentId = validateUuid(params.agentId);
    if (!agentId) {
        res.status(400).json({
            error: "Invalid AgentId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        });
        return null;
    }

    if (params.roomId) {
        const roomId = validateUuid(params.roomId);
        if (!roomId) {
            res.status(400).json({
                error: "Invalid RoomId format. Expected to be a UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
            });
            return null;
        }
        return { agentId, roomId };
    }

    return { agentId };
}

export function createMoxieApiRouter(
    agents: Map<string, AgentRuntime>,
    moxieClient: MoxieClient
) {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );
    router.use(traceIdMiddleware);

    router.get("/", async (req, res) => {
        res.send("Ok");
    });

    router.post("/:agentId/message", auth, async (req, res) => {
        try {
            elizaLogger.debug(`/v1 message api is started`, {
                traceId: req.traceId,
            });
            const privyId = req.privyId;
            elizaLogger.info(`privyId extracted from token: ${privyId}`, {
                traceId: req.traceId,
            });
            const agentId = req.params.agentId;
            let runtime = agents.get(agentId);

            // validations
            const { roomId, text } = req.body;

            if (!roomId || !validateUuid(roomId)) {
                res.status(400).json(
                    ResponseHelper.error<UserAgentInfo>(
                        "MISSING_MANDATORY_INPUT",
                        "Invalid or missing `roomId`. Expected to be a valid UUID.",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            if (!text || text.trim() === "") {
                res.status(400).json(
                    ResponseHelper.error<UserAgentInfo>(
                        "MISSING_MANDATORY_INPUT",
                        "input field `text` is empty or missing",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            elizaLogger.debug(
                `checking if runtime exists for agentId: ${agentId}`,
                { traceId: req.traceId }
            );
            // if runtime is null, look for runtime with the same name
            if (!runtime) {
                runtime = Array.from(agents.values()).find(
                    (a: AgentRuntime) =>
                        a.character.name.toLowerCase() === agentId.toLowerCase()
                );
            }

            if (!runtime) {
                res.status(404).json(
                    ResponseHelper.error<UserAgentInfo>(
                        "AGENT_NOT_FOUND",
                        "Agent not found",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            let moxieUserId: string = await runtime.cacheManager.get(
                `privyId-${privyId}`
            );
            let moxieUserInfo: MoxieUser = undefined;
            let agentWallet: Wallet = undefined;
            if (moxieUserId) {
                elizaLogger.info(
                    `privyId exists in cache hence skipping the api calls and get the data from memory`,
                    { traceId: req.traceId }
                );
                moxieUserInfo = await runtime.cacheManager.get(
                    `moxieUserInfo-${moxieUserId}`
                );
                agentWallet = await runtime.cacheManager.get(
                    `agentWallet-${moxieUserId}`
                );
            } else {
                // trigger apis to fetch details
                moxieUserInfo =
                    await moxieUserService.getUserByPrivyBearerToken(
                        req.header("Authorization")
                    );
                elizaLogger.info(
                    `moxieUserInfo`,
                    { moxieUserInfo },
                    { traceId: req.traceId }
                );
                moxieUserId = moxieUserInfo.id;
                // check if the user has an account. if not then throw error to create agent
                const accountResponse =
                    await runtime.databaseAdapter.getAccountById(
                        stringToUuid(moxieUserId)
                    );
                if (!accountResponse) {
                    res.status(403).json(
                        ResponseHelper.error<null>(
                            "AGENT_NOT_EXISTS",
                            `user doesn't have an agent`,
                            req.path,
                            req.traceId
                        )
                    );
                    return;
                }

                const privyUserDetails = await privyClient.getUserById(privyId);
                const linkedAccounts = privyUserDetails.linkedAccounts?.filter(
                    (linkedAccount) =>
                        linkedAccount.type == "wallet" &&
                        linkedAccount.connectorType == "embedded"
                );
                agentWallet =
                    linkedAccounts && linkedAccounts.length > 0
                        ? (linkedAccounts[0] as Wallet)
                        : undefined;
                elizaLogger.info(
                    `agentWallet`,
                    { agentWallet },
                    { traceId: req.traceId }
                );

                // set in cache
                const expiry = Date.now() + 300000; // 5 minutes
                await runtime.cacheManager.set(
                    `moxieUserInfo-${moxieUserId}`,
                    moxieUserInfo,
                    { expires: expiry }
                ); // moxieUserInfo-<<moxie userid>> to user object
                await runtime.cacheManager.set(
                    stringToUuid(moxieUserId),
                    moxieUserId,
                    { expires: expiry }
                ); // userId uuid mapping to moxie userid
                await runtime.cacheManager.set(
                    `agentWallet-${moxieUserId}`,
                    agentWallet,
                    { expires: expiry }
                ); // agent wallet info
                await runtime.cacheManager.set(
                    `privyId-${privyId}`,
                    moxieUserId,
                    { expires: expiry }
                ); // privyId to moxie user id with 5 minutes expiration
                elizaLogger.info("successfully set the cache elements", {
                    traceId: req.traceId,
                });
            }

            // validate if user has min. creator agent coins
            const { creatorAgentBalance, hasSufficientBalance } =
                await validateCreatorAgentCoinBalance(moxieUserInfo.wallets);
            if (!hasSufficientBalance) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "USER_NOT_ELIGIBILE",
                        `user need to hold ${MINIMUM_CREATOR_AGENT_COINS} creator agent tokens to interact with agent. current balance is ${creatorAgentBalance}`,
                        req.path,
                        req.traceId,
                        {
                            minimumCreatorAgentCoins:
                                MINIMUM_CREATOR_AGENT_COINS,
                            currentCreatorAgentCoinsBalance:
                                creatorAgentBalance,
                        }
                    )
                );
                return;
            }

            const userId = stringToUuid(moxieUserId);

            // check the roomId is belongs to this user or not.
            const participants =
                await runtime.databaseAdapter.getParticipantsForRoom(roomId);
            if (
                participants &&
                participants.length > 0 &&
                !participants.includes(userId)
            ) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "INVALID_REQUEST",
                        `user doesn't belong to this roomId`,
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            await runtime.ensureConnection(
                userId,
                roomId,
                moxieUserInfo.userName,
                moxieUserInfo.name,
                "direct"
            );

            const messageId = stringToUuid(Date.now().toString());
            const content: Content = {
                text,
                source: "direct",
                inReplyTo: req.body.inReplyTo ?? undefined,
            };

            const userMessage = {
                content,
                userId,
                roomId,
                agentId: runtime.agentId,
            };

            const memory: Memory = {
                id: stringToUuid(messageId + "-" + userId),
                ...userMessage,
                agentId: runtime.agentId,
                userId,
                roomId,
                content,
                createdAt: Date.now(),
            };

            await runtime.messageManager.addEmbeddingToMemory(memory);
            await runtime.messageManager.createMemory(memory);

            let state = await runtime.composeState(userMessage, {
                agentName: runtime.character.name,
                moxieUserInfo: moxieUserInfo,
                agentWallet: agentWallet,
            });

            const context = composeContext({
                state,
                template: messageHandlerTemplate,
            });

            const response = await generateMessageResponse({
                runtime: runtime,
                context,
                modelClass: ModelClass.LARGE,
            });

            if (!response) {
                res.status(500).json(
                    ResponseHelper.error<null>(
                        "INTERNAL_SERVER_ERROR",
                        "No response from generateMessageResponse",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // Set headers for chunked transfer encoding
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Transfer-Encoding", "chunked");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("Cache-Control", "no-cache");
            res.flushHeaders(); // Ensure headers are sent immediately

            // save response to memory
            const responseMessage: Memory = {
                id: stringToUuid(messageId + "-" + runtime.agentId),
                ...userMessage,
                userId: runtime.agentId,
                content: response,
                embedding: getEmbeddingZeroVector(),
                createdAt: Date.now(),
            };

            // if the response contains action field, then we dont need to save the memory
            if (!response.action) {
                await runtime.messageManager.createMemory(responseMessage);
                state = await runtime.updateRecentMessageState(state);
            }
            // check if the user has explicitly provided the action in the request. e.g, this could be for followup actions
            // then overwrite the action in the response
            if (req.body.action) {
                response.action = req.body.action;
            }

            let message = null as Content | null;

            elizaLogger.debug(`processing actions for agentId: ${agentId}`, {
                traceId: req.traceId,
            });

            let messageFromActions: boolean = false;
            let newContext = "";
            let newAction = undefined;
            await runtime.processActions(
                memory,
                [responseMessage],
                state,
                async (newMessages) => {
                    messageFromActions = true;
                    message = newMessages;
                    newAction = newMessages.action;
                    newContext += newMessages.text;

                    await new Promise((resolve) => setTimeout(resolve, 100)); // sleep for 100ms to avoid sending multiple chunks in a single request
                    res.write(JSON.stringify(newMessages));
                    return [memory];
                }
            );

            const newMessageId = stringToUuid(Date.now().toString());
            const newContent: Content = {
                text: newContext,
                inReplyTo: memory.id,
                action: newAction,
            };

            const agentMessage = {
                content: newContent,
                userId: runtime.agentId,
                roomId,
                agentId: runtime.agentId,
            };

            const newMemory: Memory = {
                id: newMessageId,
                ...agentMessage,
                agentId: runtime.agentId,
                userId: runtime.agentId,
                roomId,
                content,
                createdAt: Date.now(),
            };

            await runtime.messageManager.addEmbeddingToMemory(newMemory);
            await runtime.messageManager.createMemory(newMemory);

            await runtime.evaluate(memory, state);

            // Check if we should suppress the initial message
            const action = runtime.actions.find(
                (a) => a.name === response.action
            );
            const shouldSuppressInitialMessage = action?.suppressInitialMessage;

            if (!shouldSuppressInitialMessage) {
                // write the response to the response stream
                res.write(JSON.stringify(response));
                // sleep for 100ms to avoid sending multiple chunks in a single request
                await new Promise((resolve) => setTimeout(resolve, 100));
                if (message && !messageFromActions) {
                    res.write(JSON.stringify(message));
                }
            } else {
                if (message && !messageFromActions) {
                    res.write(JSON.stringify(message));
                }
            }
            res.end();
        } catch (error) {
            elizaLogger.error(error, { traceId: req.traceId });
            res.status(500).write(
                JSON.stringify(
                    ResponseHelper.error<null>(
                        "INTERNAL_SERVER_ERROR",
                        `error from message api ${error.message}`,
                        req.path,
                        req.traceId
                    )
                )
            );
            res.end();
            return;
        }
    });

    router.get("/agent", auth, async (req, res) => {
        elizaLogger.debug(
            `/agent endpoint is triggered with params: ${JSON.stringify(req.query)}`,
            { traceId: req.traceId }
        );
        try {
            // validate if useId request param exists, if not then return error
            const userId = req.query.userId as string;
            if (!userId) {
                res.status(400).json(
                    ResponseHelper.error<UserAgentInfo>(
                        "MISSING_MANDATORY_INPUT",
                        "missing userId input in request param",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }
            // check if the userId has any interaction with the agent
            const userIdUUID = stringToUuid(userId);
            const account = await moxieClient.db.getAccountById(userIdUUID);

            // if account doesn't exist then return
            if (!account) {
                res.status(200).json(
                    ResponseHelper.success<UserAgentInfo>(
                        {
                            agentExists: false,
                            userId: userId,
                        },
                        req.traceId
                    )
                );
            } else {
                //await moxieClient.db.getAgent
                // set agentExists as true if account is present
                // for v1 version , we will just use one agent instance. hence we are going to maintain the env and return in response
                // for v2 release, we will create new agent runtime for every user and maintain separate agentIds.
                res.status(200).json(
                    ResponseHelper.success<UserAgentInfo>(
                        {
                            agentExists: true,
                            userId: userId,
                            agentId: COMMON_AGENT_ID,
                            //roomId: stringToUuid()
                        },
                        req.traceId
                    )
                );
            }
        } catch (error) {
            elizaLogger.error("Error fetching agent details:", error, {
                traceId: req.traceId,
            });
            res.status(500).json(
                ResponseHelper.error<UserAgentInfo>(
                    "INTERNAL_SERVER_ERROR",
                    `Failed to fetch user agent details: ${error}`,
                    req.path,
                    req.traceId
                )
            );
        }
    });

    router.post("/agent", auth, async (req, res) => {
        elizaLogger.debug(
            `POST /agent endpoint is triggered with params: ${req.body}`,
            { traceId: req.traceId }
        );
        try {
            // validations
            const moxieUserInfo =
                await moxieUserService.getUserByPrivyBearerToken(
                    req.header("Authorization")
                );
            const moxieUserId = moxieUserInfo.id;
            // check if the userId has  already agent created
            const userIdUUID = stringToUuid(moxieUserId);
            const account = await moxieClient.db.getAccountById(userIdUUID);
            if (account) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "INVALID_REQUEST",
                        `user already has an agent`,
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // check if the user has creator coin or not
            const ftaResponse = await ftaService.getUserFtaData(moxieUserId);
            if (!ftaResponse) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "USER_NOT_ELIGIBILE",
                        `user must have creator coin to create an agent`,
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // Check if the user has sufficient creator agent coins.
            const { creatorAgentBalance, hasSufficientBalance } =
                await validateCreatorAgentCoinBalance(moxieUserInfo.wallets);
            if (!hasSufficientBalance) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "USER_NOT_ELIGIBILE",
                        `user need to hold ${MINIMUM_CREATOR_AGENT_COINS} creator agent tokens to create an agent. current balance is: ${creatorAgentBalance}`,
                        req.path,
                        req.traceId,
                        {
                            minimumCreatorAgentCoins:
                                MINIMUM_CREATOR_AGENT_COINS,
                            currentCreatorAgentCoinsBalance:
                                creatorAgentBalance,
                        }
                    )
                );
                return;
            }

            // create an account for the user
            const accountCreationResponse = await moxieClient.db.createAccount({
                id: userIdUUID,
                name: moxieUserInfo.userName + " AI Agent",
                username: moxieUserInfo.name,
            });

            elizaLogger.info(
                `account is created for ${moxieUserId} agent} ${accountCreationResponse}`
            );
            res.status(201).json(
                ResponseHelper.success<UserAgentInfo>(
                    {
                        userId: moxieUserInfo.id,
                        agentId: COMMON_AGENT_ID,
                    },
                    req.traceId
                )
            );
            return;
        } catch (error) {
            elizaLogger.error("Error in create agent function:", error, {
                traceId: req.traceId,
            });
            res.status(500).json(
                ResponseHelper.error<null>(
                    "INTERNAL_SERVER_ERROR",
                    `Failed to create agent: ${error}`,
                    req.path,
                    req.traceId
                )
            );
            return;
        }
    });

    router.get("/agent/interactions", auth, async (req, res) => {
        elizaLogger.debug(`started /agent/interactions started`, {
            traceId: req.traceId,
        });
        try {
            // input validations
            const errors = validateInputAgentInteractions(req.query);
            if (errors.length > 0) {
                res.status(400).json(
                    ResponseHelper.error<null>(
                        "MISSING_MANDATORY_INPUT",
                        errors
                            .map((e) => `${e.field}: ${e.message}`)
                            .join(", "),
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // fetch the agent runtime
            const agentId = COMMON_AGENT_ID;
            let runtime = agents.get(agentId);

            let moxieUserInfo: MoxieUser = undefined;
            let moxieUserId: string = await runtime.cacheManager.get(
                `privyId-${req.privyId}`
            );
            if (moxieUserId) {
                elizaLogger.info(
                    `privyId exists in cache hence skipping the api calls and get the data from cache`,
                    { traceId: req.traceId }
                );
                moxieUserInfo = await runtime.cacheManager.get(
                    `moxieUserInfo-${moxieUserId}`
                );
            } else {
                moxieUserInfo =
                    await moxieUserService.getUserByPrivyBearerToken(
                        req.header("Authorization")
                    );
            }
            elizaLogger.debug(`moxieUserId ${moxieUserId}`, {
                traceId: req.traceId,
            });

            // if runtime is null, look for runtime with the same name
            if (!runtime) {
                runtime = Array.from(agents.values()).find(
                    (a: AgentRuntime) =>
                        a.character.name.toLowerCase() === agentId.toLowerCase()
                );
            }

            if (!runtime) {
                res.status(404).json(
                    ResponseHelper.error<null>(
                        "AGENT_NOT_FOUND",
                        "Agent not found",
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // check if the userId has  already agent created
            const userIdUUID = stringToUuid(moxieUserInfo.id);
            const account =
                await runtime.databaseAdapter.getAccountById(userIdUUID);
            if (!account) {
                res.status(403).json(
                    ResponseHelper.error<null>(
                        "INVALID_REQUEST",
                        `user doesn't have agent`,
                        req.path,
                        req.traceId
                    )
                );
                return;
            }

            // Find all rooms where user and agent are participants
            const rooms = await runtime.databaseAdapter.getRoomsForParticipants(
                [userIdUUID]
            );

            // Check the existing memories in the database
            const currentRoomId = req.params.currentRoomId;
            const recentInteractions: Memory[] =
                await runtime.messageManager.getMemoriesByRoomIds({
                    // filter out the current room id from rooms
                    roomIds: rooms.filter((room) => room !== currentRoomId),
                    limit: Number(req.query.limit),
                });

            // Format the recent messages
            const firstInteractionGroupedByRoom = recentInteractions.reduce(
                (acc, message) => {
                    const isSelf = message.userId === runtime.agentId;

                    // Skip if this is a self message
                    if (isSelf) return acc;

                    const msg: UserAgentInteraction = {
                        text: message.content.text,
                        userId: message.userId,
                        roomId: message.roomId,
                        createdAt: message.createdAt,
                        agentId: message.agentId,
                    };

                    // If this is the first message for this room, or if it's earlier than the existing one
                    if (
                        !acc[message.roomId] ||
                        message.createdAt < acc[message.roomId].createdAt
                    ) {
                        acc[message.roomId] = msg;
                    }

                    return acc;
                },
                {} as Record<string, UserAgentInteraction>
            );

            // Extract only the values from groupedByRoom
            // Convert the values to JSON
            let groupedByRoomValuesJSON: UserAgentInteraction[];
            if (firstInteractionGroupedByRoom) {
                groupedByRoomValuesJSON = Object.values(
                    firstInteractionGroupedByRoom
                );
            }
            res.status(200).json(
                ResponseHelper.success<UserAgentInteraction[]>(
                    groupedByRoomValuesJSON,
                    req.traceId
                )
            );
        } catch (error) {
            elizaLogger.error("Error while fetching agent memories:", error, {
                traceId: req.traceId,
            });
            res.status(500).json(
                ResponseHelper.error<null>(
                    "INTERNAL_SERVER_ERROR",
                    `Error while fetching user interactions: ${error}`,
                    req.path,
                    req.traceId
                )
            );
            return;
        }
    });

    router.get("/agent/:agentId/:roomId/memories", auth, async (req, res) => {
        elizaLogger.debug(
            `/agent/:agentId/:roomId/memories started with input:${req.params}`,
            { traceId: req.traceId }
        );
        const { agentId, roomId } = validateUUIDParams(
            {
                agentId: req.params.agentId,
                roomId: req.params.roomId,
            },
            res
        ) ?? {
            agentId: null,
            roomId: null,
        };

        if (!agentId || !roomId) {
            res.status(400).json(
                ResponseHelper.error<null>(
                    "MISSING_MANDATORY_INPUT",
                    `missing or invalid input for agentId / roomId`,
                    req.path,
                    req.traceId
                )
            );
            return;
        }

        let runtime = agents.get(agentId);

        // if runtime is null, look for runtime with the same name
        if (!runtime) {
            runtime = Array.from(agents.values()).find(
                (a) => a.character.name.toLowerCase() === agentId.toLowerCase()
            );
        }

        if (!runtime) {
            res.status(404).json(
                ResponseHelper.error<null>(
                    "AGENT_NOT_FOUND",
                    "Agent not found",
                    req.path,
                    req.traceId
                )
            );
            return;
        }

        try {
            const memories = await runtime.messageManager.getMemories({
                roomId,
                count: 100,
                unique: true,
            });
            const response = {
                agentId,
                roomId,
                memories: memories.map((memory) => ({
                    id: memory.id,
                    userId: memory.userId,
                    agentId: memory.agentId,
                    createdAt: memory.createdAt,
                    text: memory.content.text,
                    action: memory.content.action,
                    source: memory.content.source,
                    url: memory.content.url,
                    inReplyTo: memory.content.inReplyTo,
                    roomId: memory.roomId,
                })),
            };
            res.status(200).json(
                ResponseHelper.success<any>(response, req.traceId)
            );
        } catch (error) {
            elizaLogger.error("Error fetching memories:", error);
            res.status(500).json(
                ResponseHelper.error<null>(
                    "INTERNAL_SERVER_ERROR",
                    `Error while fetching memories from room: ${error}`,
                    req.path,
                    req.traceId
                )
            );
            return;
        }
    });

    return router;
}
