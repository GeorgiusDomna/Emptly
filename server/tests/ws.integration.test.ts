import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { createChatServer } from "../src/index.js";

type AnyEvent = Record<string, unknown> & { type: string };
const PROTOCOL_VERSION = "1.3";

test("ws flow: join, message, full room, leave", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		rateLimitWindowMs: 10_000,
		rateLimitEventsPerWindow: 120,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

	const a = await openSocket(wsUrl);
	const b = await openSocket(wsUrl);
	const c = await openSocket(wsUrl);

	a.send(
		JSON.stringify({
			type: "join_room",
			roomId: "room-1",
			userId: "u1",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const aJoined = await waitForEvent(a, "room_joined");
	assert.equal(aJoined.participants, 1);
	assert.equal(aJoined.protocolVersion, PROTOCOL_VERSION);

	b.send(
		JSON.stringify({
			type: "join_room",
			roomId: "room-1",
			userId: "u2",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const [bJoined, aPeerJoined] = await Promise.all([
		waitForEvent(b, "room_joined"),
		waitForEvent(a, "peer_joined")
	]);
	assert.equal(bJoined.participants, 2);
	assert.equal(aPeerJoined.participants, 2);
	assert.equal(bJoined.protocolVersion, PROTOCOL_VERSION);
	assert.equal(aPeerJoined.protocolVersion, PROTOCOL_VERSION);
	assert.equal(typeof bJoined.handshakeSessionId, "string");
	assert.equal(aPeerJoined.handshakeSessionId, bJoined.handshakeSessionId);
	await completeHandshake(a, "u1", b, "u2", "room-1", String(bJoined.handshakeSessionId));

	a.send(
		JSON.stringify({
			type: "chat_message",
			roomId: "room-1",
			userId: "u1",
			messageId: "m-1",
			ciphertext: "c2VjcmV0",
			iv: "aXYxMjM",
			sentAt: new Date().toISOString(),
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const [aMsg, bMsg] = await Promise.all([waitForEvent(a, "new_message"), waitForEvent(b, "new_message")]);
	assert.equal(aMsg.messageId, "m-1");
	assert.equal(bMsg.messageId, "m-1");
	assert.equal(aMsg.ciphertext, "c2VjcmV0");
	assert.equal(bMsg.ciphertext, "c2VjcmV0");
	assert.equal(aMsg.protocolVersion, PROTOCOL_VERSION);
	assert.equal(bMsg.protocolVersion, PROTOCOL_VERSION);

	c.send(
		JSON.stringify({
			type: "join_room",
			roomId: "room-1",
			userId: "u3",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const cFull = await waitForEvent(c, "room_full");
	assert.equal(cFull.code, "ROOM_FULL");
	assert.equal(cFull.protocolVersion, PROTOCOL_VERSION);

	b.send(
		JSON.stringify({ type: "leave_room", roomId: "room-1", userId: "u2", protocolVersion: PROTOCOL_VERSION })
	);
	const peerLeft = await waitForEvent(a, "peer_left");
	assert.equal(peerLeft.userId, "u2");
	assert.equal(peerLeft.participants, 1);
	assert.equal(peerLeft.protocolVersion, PROTOCOL_VERSION);

	a.close();
	b.close();
	c.close();
	await chatServer.stop();
});

test("ws protocol errors: invalid json, unknown event, room mismatch", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		rateLimitWindowMs: 10_000,
		rateLimitEventsPerWindow: 120,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

	const ws = await openSocket(wsUrl);

	ws.send("not-json");
	const invalidJson = await waitForEvent(ws, "error");
	assert.equal(invalidJson.code, "INVALID_PAYLOAD");

	ws.send(
		JSON.stringify({
			type: "something_else",
			roomId: "r1",
			userId: "u1",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const unknownEvent = await waitForEvent(ws, "error");
	assert.equal(unknownEvent.code, "UNKNOWN_EVENT");
	assert.equal(unknownEvent.protocolVersion, PROTOCOL_VERSION);

	ws.send(
		JSON.stringify({
			type: "join_room",
			roomId: "r1",
			userId: "u1",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	await waitForEvent(ws, "room_joined");

	ws.send(
		JSON.stringify({
			type: "chat_message",
			roomId: "wrong-room",
			userId: "u1",
			messageId: "m1",
			ciphertext: "dGVzdA",
			iv: "aXY",
			sentAt: new Date().toISOString(),
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const roomMismatch = await waitForEvent(ws, "error");
	assert.equal(roomMismatch.code, "ROOM_MISMATCH");
	assert.equal(roomMismatch.protocolVersion, PROTOCOL_VERSION);

	ws.close();
	await chatServer.stop();
});

test("ws requires handshake before chat message", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		rateLimitWindowMs: 10_000,
		rateLimitEventsPerWindow: 120,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

	const a = await openSocket(wsUrl);
	const b = await openSocket(wsUrl);

	a.send(JSON.stringify({ type: "join_room", roomId: "auth-room", userId: "u1", protocolVersion: PROTOCOL_VERSION }));
	b.send(JSON.stringify({ type: "join_room", roomId: "auth-room", userId: "u2", protocolVersion: PROTOCOL_VERSION }));
	await waitForEvent(a, "room_joined");
	await waitForEvent(b, "room_joined");

	a.send(
		JSON.stringify({
			type: "chat_message",
			roomId: "auth-room",
			userId: "u1",
			messageId: "m-before-handshake",
			ciphertext: "x",
			iv: "y",
			sentAt: new Date().toISOString(),
			protocolVersion: PROTOCOL_VERSION
		})
	);
	const handshakeRequired = await waitForEvent(a, "error");
	assert.equal(handshakeRequired.code, "HANDSHAKE_REQUIRED");
	assert.equal(handshakeRequired.protocolVersion, PROTOCOL_VERSION);

	a.close();
	b.close();
	await chatServer.stop();
});

test("ws rate limits noisy clients", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		rateLimitWindowMs: 1_000,
		rateLimitEventsPerWindow: 3,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

	const ws = await openSocket(wsUrl);
	const joinPayload = JSON.stringify({
		type: "join_room",
		roomId: "rate-limit-room",
		userId: "spam-user",
		protocolVersion: PROTOCOL_VERSION
	});
	ws.send(joinPayload);
	await waitForEvent(ws, "room_joined");
	ws.send(joinPayload);
	ws.send(joinPayload);
	ws.send(joinPayload);

	const limited = await waitForEvent(ws, "error");
	assert.equal(limited.code, "RATE_LIMITED");
	assert.equal(limited.protocolVersion, PROTOCOL_VERSION);

	ws.close();
	await chatServer.stop();
});

test("health endpoint does not expose global room metadata", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		rateLimitWindowMs: 10_000,
		rateLimitEventsPerWindow: 120,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const wsUrl = `ws://127.0.0.1:${address.port}/ws`;
	const healthUrl = `http://127.0.0.1:${address.port}/health`;

	const socket = await openSocket(wsUrl);
	socket.send(
		JSON.stringify({
			type: "join_room",
			roomId: "private-room-id",
			userId: "u1",
			protocolVersion: PROTOCOL_VERSION
		})
	);
	await waitForEvent(socket, "room_joined");

	const response = await fetch(healthUrl);
	assert.equal(response.ok, true);
	const payload = (await response.json()) as {
		status?: string;
		protocolVersion?: string;
		activeRooms?: unknown;
	};

	assert.equal(payload.status, "ok");
	assert.equal(payload.protocolVersion, PROTOCOL_VERSION);
	assert.equal("activeRooms" in payload, false);
	assert.equal(JSON.stringify(payload).includes("private-room-id"), false);

	socket.close();
	await chatServer.stop();
});

function openSocket(url: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const socket = new WebSocket(url);
		const timeout = setTimeout(() => reject(new Error("socket open timeout")), 2000);

		socket.once("open", () => {
			clearTimeout(timeout);
			resolve(socket);
		});
		socket.once("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

function waitForEvent(socket: WebSocket, expectedType: string): Promise<AnyEvent> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`timeout waiting for event ${expectedType}`));
		}, 2000);

		const onMessage = (raw: Buffer) => {
			const payload = JSON.parse(raw.toString()) as AnyEvent;
			if (payload.type !== expectedType) {
				return;
			}
			cleanup();
			resolve(payload);
		};

		const onError = (error: Error) => {
			cleanup();
			reject(error);
		};

		function cleanup(): void {
			clearTimeout(timeout);
			socket.off("message", onMessage);
			socket.off("error", onError);
		}

		socket.on("message", onMessage);
		socket.on("error", onError);
	});
}

async function completeHandshake(
	leftSocket: WebSocket,
	leftUserId: string,
	rightSocket: WebSocket,
	rightUserId: string,
	roomId: string,
	handshakeSessionId: string
): Promise<void> {
	leftSocket.send(
		JSON.stringify({
			type: "handshake_hello",
			roomId,
			userId: leftUserId,
			handshakeSessionId,
			publicKey: `${leftUserId}-pub`,
			proof: `${leftUserId}-proof`,
			protocolVersion: PROTOCOL_VERSION
		})
	);
	rightSocket.send(
		JSON.stringify({
			type: "handshake_hello",
			roomId,
			userId: rightUserId,
			handshakeSessionId,
			publicKey: `${rightUserId}-pub`,
			proof: `${rightUserId}-proof`,
			protocolVersion: PROTOCOL_VERSION
		})
	);
	await Promise.all([
		waitForEvent(leftSocket, "handshake_peer_hello"),
		waitForEvent(rightSocket, "handshake_peer_hello")
	]);

	const sharedConfirmation = "shared-confirmation";
	leftSocket.send(
		JSON.stringify({
			type: "handshake_finish",
			roomId,
			userId: leftUserId,
			handshakeSessionId,
			confirmation: sharedConfirmation,
			protocolVersion: PROTOCOL_VERSION
		})
	);
	rightSocket.send(
		JSON.stringify({
			type: "handshake_finish",
			roomId,
			userId: rightUserId,
			handshakeSessionId,
			confirmation: sharedConfirmation,
			protocolVersion: PROTOCOL_VERSION
		})
	);
	await Promise.all([
		waitForEvent(leftSocket, "handshake_peer_finish"),
		waitForEvent(rightSocket, "handshake_peer_finish"),
		waitForEvent(leftSocket, "handshake_ready"),
		waitForEvent(rightSocket, "handshake_ready")
	]);
}
