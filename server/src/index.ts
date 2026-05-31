import dotenv from "dotenv";
import { createServer as createHttpServer, type Server as HttpServer } from "node:http";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { readServerConfig, type ServerConfig } from "./config/env.js";
import { loadTlsOptions } from "./config/tls.js";
import { RoomManager } from "./domain/rooms/room-manager.js";
import { applyCorsHeaders, handleCorsPreflight } from "./http/cors.js";
import { createLogger } from "./shared/logger.js";
import { ConnectionRegistry } from "./ws/connection-registry.js";
import { SocketRateLimiter } from "./ws/rate-limit.js";
import {
	PROTOCOL_VERSION,
	buildErrorPayload,
	inboundEventSchema,
	type InboundEvent
} from "./ws/protocol.js";

dotenv.config();

type ChatHttpServer = HttpServer | HttpsServer;

export function createChatServer(config: ServerConfig): {
	httpServer: ChatHttpServer;
	start: () => Promise<void>;
	stop: () => Promise<void>;
} {
	const logger = createLogger(config.logLevel);
	const roomManager = new RoomManager();
	const connectionRegistry = new ConnectionRegistry();
	const socketRateLimiter = new SocketRateLimiter(
		config.rateLimitWindowMs,
		config.rateLimitEventsPerWindow
	);
	const startedAtMs = Date.now();
	let protocolErrorCount = 0;
	let isShuttingDown = false;
	const roomHandshakeStates = new Map<
		string,
		{ sessionId: string; finishedUserIds: Set<string>; readyAnnounced: boolean }
	>();

	const requestListener = (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => {
		const isHealthRoute = req.url === "/health";
		const isReadyRoute = req.url === "/ready";

		if (isHealthRoute || isReadyRoute) {
			if (handleCorsPreflight(req, res, config.corsOrigin)) {
				return;
			}

			applyCorsHeaders(req, res, config.corsOrigin);

			const statusCode = isReadyRoute && isShuttingDown ? 503 : 200;
			res.writeHead(statusCode, { "content-type": "application/json" });
			res.end(
				JSON.stringify({
					status: isReadyRoute ? (isShuttingDown ? "draining" : "ready") : "ok",
					protocolVersion: PROTOCOL_VERSION,
					uptimeSec: Math.floor((Date.now() - startedAtMs) / 1000),
					activeConnections: countActiveConnections(),
					errorCount: protocolErrorCount
				})
			);
			return;
		}

		res.writeHead(404, { "content-type": "application/json" });
		res.end(JSON.stringify({ error: "Not Found" }));
	};

	const httpServer: ChatHttpServer = config.tls
		? createHttpsServer(loadTlsOptions(config.tls), requestListener)
		: createHttpServer(requestListener);

	const wss = new WebSocketServer({ noServer: true });

	httpServer.on("upgrade", (request, socket, head) => {
		if (request.url !== "/ws") {
			socket.destroy();
			return;
		}

		wss.handleUpgrade(request, socket, head, (clientSocket) => {
			wss.emit("connection", clientSocket, request);
		});
	});

	wss.on("connection", (socket: WebSocket) => {
		connectionRegistry.create(socket);
		logger.info("ws_connection_opened", { activeConnections: countActiveConnections() });

		socket.on("pong", () => {
			connectionRegistry.setAlive(socket, true);
		});

		socket.on("message", (rawMessage) => {
			handleInboundMessage(rawMessage, socket);
		});

		socket.on("close", () => {
			handleDisconnect(socket);
		});
	});

	const heartbeatTimer = setInterval(() => {
		for (const [socket, meta] of connectionRegistry.entries()) {
			if (!meta.isAlive) {
				socket.terminate();
				continue;
			}
			connectionRegistry.setAlive(socket, false);
			socket.ping();
		}
	}, config.heartbeatIntervalMs);

	const roomTtlTimer = setInterval(() => {
		const expiredRoomIds = roomManager.getExpiredRoomIds(Date.now(), config.roomIdleTtlMs);
		for (const roomId of expiredRoomIds) {
			const sockets = roomManager.getParticipantSockets(roomId);
			for (const socket of sockets) {
				sendJson(
					socket,
					buildErrorPayload("ROOM_MISMATCH", "Комната закрыта из-за неактивности")
				);
				socket.close();
			}
			roomManager.removeRoom(roomId);
			roomHandshakeStates.delete(roomId);
		}
	}, Math.min(config.heartbeatIntervalMs, 10000));

	function handleInboundMessage(rawMessage: RawData, socket: WebSocket): void {
		if (!socketRateLimiter.consume(socket, Date.now())) {
			sendProtocolError(socket, "RATE_LIMITED", "Too many events per time window");
			logger.warn("ws_rate_limited", { activeConnections: countActiveConnections() });
			return;
		}

		const rawText = normalizeRawMessage(rawMessage);
		if (Buffer.byteLength(rawText, "utf8") > config.maxMessageBytes) {
			sendProtocolError(socket, "INVALID_PAYLOAD", "Payload too large");
			return;
		}

		const parsedPayload = parseJson(rawText);
		if (!parsedPayload) {
			sendProtocolError(socket, "INVALID_PAYLOAD", "Invalid JSON");
			return;
		}

		const eventResult = inboundEventSchema.safeParse(parsedPayload);
		if (!eventResult.success) {
			const eventType = typeof parsedPayload.type === "string" ? parsedPayload.type : null;
			const isUnknownType =
				eventType !== null &&
				eventType !== "join_room" &&
				eventType !== "leave_room" &&
				eventType !== "chat_message" &&
				eventType !== "handshake_hello" &&
				eventType !== "handshake_finish" &&
				eventType !== "typing_activity";
			sendProtocolError(
				socket,
				isUnknownType ? "UNKNOWN_EVENT" : "INVALID_PAYLOAD",
				"Event payload validation failed"
			);
			return;
		}

		handleEvent(eventResult.data, socket);
	}

	function handleEvent(event: InboundEvent, socket: WebSocket): void {
		switch (event.type) {
			case "join_room": {
				const joinResult = roomManager.join(event.roomId, {
					userId: event.userId,
					socket
				});

				if (joinResult.full) {
					sendJson(socket, {
						type: "room_full",
						roomId: event.roomId,
						code: "ROOM_FULL",
						message: "Комната уже занята двумя пользователями",
						protocolVersion: PROTOCOL_VERSION
					});
					return;
				}

				connectionRegistry.assignRoom(socket, event.roomId, event.userId);
				const handshakeState = resetRoomHandshake(event.roomId);
				sendJson(socket, {
					type: "room_joined",
					roomId: event.roomId,
					userId: event.userId,
					participants: joinResult.participants,
					handshakeSessionId: handshakeState.sessionId,
					protocolVersion: PROTOCOL_VERSION
				});

				broadcastToRoom(event.roomId, socket, {
					type: "peer_joined",
					roomId: event.roomId,
					userId: event.userId,
					participants: joinResult.participants,
					handshakeSessionId: handshakeState.sessionId,
					protocolVersion: PROTOCOL_VERSION
				});
				return;
			}

			case "handshake_hello": {
				const meta = connectionRegistry.get(socket);
				if (!meta || meta.roomId !== event.roomId || meta.userId !== event.userId) {
					sendProtocolError(socket, "ROOM_MISMATCH", "roomId or userId mismatch");
					return;
				}
				const handshakeState = getOrCreateRoomHandshake(event.roomId);
				if (event.handshakeSessionId !== handshakeState.sessionId) {
					sendProtocolError(socket, "HANDSHAKE_INVALID", "Handshake session expired");
					return;
				}
				broadcastToRoom(event.roomId, socket, {
					type: "handshake_peer_hello",
					roomId: event.roomId,
					userId: event.userId,
					handshakeSessionId: event.handshakeSessionId,
					publicKey: event.publicKey,
					proof: event.proof,
					protocolVersion: PROTOCOL_VERSION
				});
				return;
			}

			case "handshake_finish": {
				const meta = connectionRegistry.get(socket);
				if (!meta || meta.roomId !== event.roomId || meta.userId !== event.userId) {
					sendProtocolError(socket, "ROOM_MISMATCH", "roomId or userId mismatch");
					return;
				}

				const state = getOrCreateRoomHandshake(event.roomId);
				if (event.handshakeSessionId !== state.sessionId) {
					sendProtocolError(socket, "HANDSHAKE_INVALID", "Handshake session expired");
					return;
				}
				const participantUserIds = getRoomUserIds(event.roomId);
				if (participantUserIds.length !== 2 || !participantUserIds.includes(event.userId)) {
					sendProtocolError(
						socket,
						"HANDSHAKE_INVALID",
						"Handshake requires exactly two participants"
					);
					return;
				}

				state.finishedUserIds.add(event.userId);
				broadcastToRoom(event.roomId, socket, {
					type: "handshake_peer_finish",
					roomId: event.roomId,
					userId: event.userId,
					handshakeSessionId: event.handshakeSessionId,
					confirmation: event.confirmation,
					protocolVersion: PROTOCOL_VERSION
				});

				const roomUsers = getRoomUserIds(event.roomId);
				const roomReady = roomUsers.length === 2 && roomUsers.every((id) => state.finishedUserIds.has(id));
				if (roomReady && !state.readyAnnounced) {
					state.readyAnnounced = true;
					broadcastToRoom(event.roomId, null, {
						type: "handshake_ready",
						roomId: event.roomId,
						handshakeSessionId: state.sessionId,
						protocolVersion: PROTOCOL_VERSION
					});
				}
				return;
			}

			case "chat_message": {
				const meta = connectionRegistry.get(socket);
				if (!meta || meta.roomId !== event.roomId || meta.userId !== event.userId) {
					sendProtocolError(socket, "ROOM_MISMATCH", "roomId or userId mismatch");
					return;
				}
				if (!isRoomHandshakeReady(event.roomId, event.userId)) {
					sendProtocolError(
						socket,
						"HANDSHAKE_REQUIRED",
						"Complete secure handshake before sending messages"
					);
					return;
				}

				roomManager.touch(event.roomId);
				broadcastToRoom(event.roomId, null, {
					type: "new_message",
					roomId: event.roomId,
					messageId: event.messageId,
					userId: event.userId,
					ciphertext: event.ciphertext,
					iv: event.iv,
					sentAt: event.sentAt,
					protocolVersion: PROTOCOL_VERSION
				});
				return;
			}

			case "leave_room": {
				const meta = connectionRegistry.get(socket);
				if (!meta || meta.roomId !== event.roomId || meta.userId !== event.userId) {
					sendProtocolError(socket, "ROOM_MISMATCH", "roomId or userId mismatch");
					return;
				}

				const leaveResult = roomManager.leave(event.roomId, socket);
				connectionRegistry.clearRoom(socket);
				resetRoomHandshake(event.roomId);
				if (leaveResult) {
					broadcastToRoom(event.roomId, null, {
						type: "peer_left",
						roomId: event.roomId,
						userId: leaveResult.leftUserId,
						participants: leaveResult.participants,
						protocolVersion: PROTOCOL_VERSION
					});
				}
				return;
			}

			case "typing_activity": {
				const meta = connectionRegistry.get(socket);
				if (!meta || meta.roomId !== event.roomId || meta.userId !== event.userId) {
					sendProtocolError(socket, "ROOM_MISMATCH", "roomId or userId mismatch");
					return;
				}

				broadcastToRoom(event.roomId, socket, {
					type: "peer_typing",
					roomId: event.roomId,
					userId: event.userId,
					active: event.active,
					protocolVersion: PROTOCOL_VERSION
				});
			}
		}
	}

	function handleDisconnect(socket: WebSocket): void {
		const meta = connectionRegistry.get(socket);
		if (meta?.roomId) {
			const leaveResult = roomManager.leave(meta.roomId, socket);
			resetRoomHandshake(meta.roomId);
			if (leaveResult) {
				broadcastToRoom(meta.roomId, null, {
					type: "peer_left",
					roomId: meta.roomId,
					userId: leaveResult.leftUserId,
					participants: leaveResult.participants,
					protocolVersion: PROTOCOL_VERSION
				});
			}
		}
		socketRateLimiter.clear(socket);
		connectionRegistry.delete(socket);
		logger.info("ws_connection_closed", { activeConnections: countActiveConnections() });
	}

	function broadcastToRoom(roomId: string, skipSocket: WebSocket | null, payload: object): void {
		for (const roomSocket of roomManager.getParticipantSockets(roomId)) {
			if (skipSocket && roomSocket === skipSocket) {
				continue;
			}
			sendJson(roomSocket, payload);
		}
	}

	function getRoomUserIds(roomId: string): string[] {
		const userIds: string[] = [];
		for (const participantSocket of roomManager.getParticipantSockets(roomId)) {
			const meta = connectionRegistry.get(participantSocket);
			if (meta?.userId) {
				userIds.push(meta.userId);
			}
		}
		return userIds;
	}

	function getOrCreateRoomHandshake(
		roomId: string
	): { sessionId: string; finishedUserIds: Set<string>; readyAnnounced: boolean } {
		const existing = roomHandshakeStates.get(roomId);
		if (existing) {
			return existing;
		}
		const created = { sessionId: randomUUID(), finishedUserIds: new Set<string>(), readyAnnounced: false };
		roomHandshakeStates.set(roomId, created);
		return created;
	}

	function resetRoomHandshake(
		roomId: string
	): { sessionId: string; finishedUserIds: Set<string>; readyAnnounced: boolean } {
		const state = { sessionId: randomUUID(), finishedUserIds: new Set<string>(), readyAnnounced: false };
		roomHandshakeStates.set(roomId, state);
		return state;
	}

	function isRoomHandshakeReady(roomId: string, userId: string): boolean {
		const roomUsers = getRoomUserIds(roomId);
		if (roomUsers.length !== 2 || !roomUsers.includes(userId)) {
			return false;
		}
		const state = roomHandshakeStates.get(roomId);
		if (!state || !state.readyAnnounced) {
			return false;
		}
		return roomUsers.every((id) => state.finishedUserIds.has(id));
	}

	function sendProtocolError(
		socket: WebSocket,
		code: Parameters<typeof buildErrorPayload>[0],
		message: string
	): void {
		protocolErrorCount += 1;
		sendJson(socket, buildErrorPayload(code, message));
	}

	function countActiveConnections(): number {
		return Array.from(connectionRegistry.entries()).length;
	}

	return {
		httpServer,
		start: async () =>
			new Promise((resolve) => {
				isShuttingDown = false;
				httpServer.listen(config.port, () => resolve());
			}),
		stop: async () =>
			new Promise((resolve, reject) => {
				isShuttingDown = true;
				clearInterval(heartbeatTimer);
				clearInterval(roomTtlTimer);
				wss.close((error) => {
					if (error) {
						reject(error);
						return;
					}
					httpServer.close((closeError) => {
						if (closeError) {
							reject(closeError);
							return;
						}
						resolve();
					});
				});
			})
	};
}

async function bootstrap(): Promise<void> {
	const config = readServerConfig(process.env);
	const logger = createLogger(config.logLevel);
	process.on("uncaughtException", (error) => {
		logger.error("uncaught_exception", { error: error.message, stack: error.stack });
	});
	process.on("unhandledRejection", (reason) => {
		const errorText = reason instanceof Error ? reason.message : String(reason);
		const stack = reason instanceof Error ? reason.stack : undefined;
		logger.error("unhandled_rejection", { error: errorText, stack });
	});

	const chatServer = createChatServer(config);
	await chatServer.start();
	const scheme = config.tls ? "https/wss" : "http/ws";
	logger.info("chat_server_started", { scheme, port: config.port, protocolVersion: PROTOCOL_VERSION });
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entrypoint) {
	void bootstrap();
}

function parseJson(rawText: string): Record<string, unknown> | null {
	try {
		const payload = JSON.parse(rawText);
		if (!payload || typeof payload !== "object") {
			return null;
		}
		return payload as Record<string, unknown>;
	} catch {
		return null;
	}
}

function normalizeRawMessage(rawMessage: RawData): string {
	if (typeof rawMessage === "string") {
		return rawMessage;
	}
	if (Array.isArray(rawMessage)) {
		return Buffer.concat(rawMessage).toString("utf8");
	}
	if (rawMessage instanceof ArrayBuffer) {
		return Buffer.from(new Uint8Array(rawMessage)).toString("utf8");
	}
	return rawMessage.toString("utf8");
}

function sendJson(socket: WebSocket, payload: object): void {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify(payload));
	}
}
