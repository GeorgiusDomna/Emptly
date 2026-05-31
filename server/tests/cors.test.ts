import assert from "node:assert/strict";
import test from "node:test";
import { isOriginAllowed, parseAllowedOrigins } from "../src/http/cors.js";

test("parseAllowedOrigins splits comma-separated values", () => {
	assert.deepEqual(parseAllowedOrigins("https://a.example.com, https://b.example.com"), [
		"https://a.example.com",
		"https://b.example.com"
	]);
});

test("isOriginAllowed matches any configured origin", () => {
	const corsOrigin = "https://app.example.com,https://www.app.example.com";
	assert.equal(isOriginAllowed("https://app.example.com", corsOrigin), true);
	assert.equal(isOriginAllowed("https://www.app.example.com", corsOrigin), true);
	assert.equal(isOriginAllowed("https://other.example.com", corsOrigin), false);
});

test("health endpoint returns CORS headers for allowed frontend origin", async () => {
	const { createChatServer } = await import("../src/index.js");

	const chatServer = createChatServer({
		port: 0,
		maxMessageBytes: 4096,
		heartbeatIntervalMs: 30_000,
		roomIdleTtlMs: 60_000,
		corsOrigin: "https://app.example.com",
		rateLimitWindowMs: 10_000,
		rateLimitEventsPerWindow: 120,
		logLevel: "error",
		tls: null
	});
	await chatServer.start();

	const address = chatServer.httpServer.address();
	assert.ok(address && typeof address !== "string");
	const healthUrl = `http://127.0.0.1:${address.port}/health`;

	const response = await fetch(healthUrl, {
		headers: { Origin: "https://app.example.com" }
	});

	assert.equal(response.ok, true);
	assert.equal(response.headers.get("access-control-allow-origin"), "https://app.example.com");

	await chatServer.stop();
});
