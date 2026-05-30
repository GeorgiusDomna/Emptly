import { resolveTlsFilePaths, type TlsFilePaths } from "./tls.js";

export type ServerConfig = {
	port: number;
	maxMessageBytes: number;
	heartbeatIntervalMs: number;
	roomIdleTtlMs: number;
	corsOrigin: string | null;
	rateLimitWindowMs: number;
	rateLimitEventsPerWindow: number;
	logLevel: "debug" | "info" | "warn" | "error";
	tls: TlsFilePaths | null;
};

export function readServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
	const nodeEnv = env.NODE_ENV?.trim().toLowerCase() ?? "development";
	const corsOrigin = env.CORS_ORIGIN?.trim() || null;
	if (nodeEnv === "production" && !corsOrigin) {
		throw new Error("CORS_ORIGIN is required in production");
	}

	return {
		port: parseNumber(env.PORT, 5001),
		maxMessageBytes: parseNumber(env.MAX_MESSAGE_BYTES, 4096),
		heartbeatIntervalMs: parseNumber(env.HEARTBEAT_INTERVAL_MS, 30000),
		roomIdleTtlMs: parseNumber(env.ROOM_IDLE_TTL_MS, 1800000),
		corsOrigin,
		rateLimitWindowMs: parseNumber(env.RATE_LIMIT_WINDOW_MS, 10000),
		rateLimitEventsPerWindow: parseNumber(env.RATE_LIMIT_EVENTS_PER_WINDOW, 120),
		logLevel: parseLogLevel(env.LOG_LEVEL),
		tls: resolveTlsFilePaths(env)
	};
}

function parseNumber(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseLogLevel(value: string | undefined): "debug" | "info" | "warn" | "error" {
	const normalized = value?.trim().toLowerCase();
	if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
		return normalized;
	}
	return "info";
}
