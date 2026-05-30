import assert from "node:assert/strict";
import test from "node:test";
import { readServerConfig } from "../src/config/env.js";

test("readServerConfig requires CORS_ORIGIN in production", () => {
	assert.throws(
		() =>
			readServerConfig({
				NODE_ENV: "production",
				PORT: "5001"
			}),
		/CORS_ORIGIN is required in production/
	);
});

test("readServerConfig parses rate limit and log level", () => {
	const config = readServerConfig({
		NODE_ENV: "production",
		PORT: "5001",
		CORS_ORIGIN: "https://chat.example.com",
		RATE_LIMIT_WINDOW_MS: "5000",
		RATE_LIMIT_EVENTS_PER_WINDOW: "80",
		LOG_LEVEL: "warn"
	});

	assert.equal(config.rateLimitWindowMs, 5000);
	assert.equal(config.rateLimitEventsPerWindow, 80);
	assert.equal(config.logLevel, "warn");
});
