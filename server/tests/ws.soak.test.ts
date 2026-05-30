import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { createChatServer } from "../src/index.js";

const PROTOCOL_VERSION = "1.3";

test("ws soak: repeated join/leave cycles keep server stable", async () => {
	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: null,
		tls: null
	});
	await chatServer.start();

	try {
		const address = chatServer.httpServer.address();
		assert.ok(address && typeof address !== "string");
		const wsUrl = `ws://127.0.0.1:${address.port}/ws`;

		const heapBaseline = process.memoryUsage().heapUsed;
		for (let index = 0; index < 30; index += 1) {
			const roomId = `soak-room-${index}`;
			const a = await openSocket(wsUrl);
			const b = await openSocket(wsUrl);

			a.send(JSON.stringify({ type: "join_room", roomId, userId: "u1", protocolVersion: PROTOCOL_VERSION }));
			await waitForEvent(a, "room_joined");

			b.send(JSON.stringify({ type: "join_room", roomId, userId: "u2", protocolVersion: PROTOCOL_VERSION }));
			await Promise.all([waitForEvent(b, "room_joined"), waitForEvent(a, "peer_joined")]);

			a.close();
			b.close();
			await Promise.all([waitForClose(a), waitForClose(b)]);
		}

		await delay(50);
		if (typeof global.gc === "function") {
			global.gc();
			await delay(10);
		}

		const heapAfter = process.memoryUsage().heapUsed;
		assert.ok(heapAfter - heapBaseline < 32 * 1024 * 1024);

		const healthResponse = await fetch(`http://127.0.0.1:${address.port}/health`);
		assert.equal(healthResponse.ok, true);
	} finally {
		await chatServer.stop();
	}
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

function waitForEvent(socket: WebSocket, expectedType: string): Promise<Record<string, unknown>> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error(`timeout waiting for event ${expectedType}`));
		}, 2000);

		const onMessage = (raw: Buffer) => {
			const payload = JSON.parse(raw.toString()) as Record<string, unknown> & { type?: unknown };
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

function waitForClose(socket: WebSocket): Promise<void> {
	return new Promise((resolve) => {
		if (socket.readyState === WebSocket.CLOSED) {
			resolve();
			return;
		}
		socket.once("close", () => resolve());
	});
}
