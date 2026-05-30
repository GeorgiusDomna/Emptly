import { resolveTlsFilePaths, type TlsFilePaths } from "./tls.js";

export type ServerConfig = {
	port: number;
	maxMessageBytes: number;
	heartbeatIntervalMs: number;
	roomIdleTtlMs: number;
	corsOrigin: string | null;
	tls: TlsFilePaths | null;
};

export function readServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
	return {
		port: parseNumber(env.PORT, 5001),
		maxMessageBytes: parseNumber(env.MAX_MESSAGE_BYTES, 4096),
		heartbeatIntervalMs: parseNumber(env.HEARTBEAT_INTERVAL_MS, 30000),
		roomIdleTtlMs: parseNumber(env.ROOM_IDLE_TTL_MS, 1800000),
		corsOrigin: env.CORS_ORIGIN?.trim() || null,
		tls: resolveTlsFilePaths(env)
	};
}

function parseNumber(value: string | undefined, fallback: number): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
