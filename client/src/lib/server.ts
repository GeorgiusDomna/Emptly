export const PROTOCOL_VERSION = "1.4";

export type WebSocketTransport = "ws" | "wss";

declare const process: {
	env: {
		BACKEND_PORT?: string;
		VITE_WS_URL?: string;
		VITE_HEALTH_URL?: string;
	};
};

function resolveServerHost(): string {
	return window.location.hostname;
}

function getBackendPort(): number | null {
	const port = Number(process.env.BACKEND_PORT);
	return Number.isFinite(port) && port > 0 ? port : null;
}

function trimEnvUrl(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function resolveWsUrl(): string {
	const explicit = trimEnvUrl(process.env.VITE_WS_URL);
	if (explicit) {
		return explicit;
	}

	const protocol = window.location.protocol === "https:" ? "wss" : "ws";
	const backendPort = getBackendPort();
	if (backendPort) {
		return `${protocol}://${resolveServerHost()}:${backendPort}/ws`;
	}
	return `${protocol}://${window.location.host}/ws`;
}

export function resolveWebSocketTransport(): WebSocketTransport {
	try {
		return new URL(resolveWsUrl()).protocol === "wss:" ? "wss" : "ws";
	} catch {
		const url = resolveWsUrl();
		return url.startsWith("wss://") ? "wss" : "ws";
	}
}

function deriveHealthUrlFromWebSocketUrl(wsUrl: string): string | null {
	try {
		const parsed = new URL(wsUrl);
		parsed.protocol = parsed.protocol === "wss:" ? "https:" : "http:";
		parsed.pathname = "/health";
		parsed.search = "";
		parsed.hash = "";
		return parsed.toString();
	} catch {
		return null;
	}
}

export function resolveHealthUrl(): string {
	const explicit = trimEnvUrl(process.env.VITE_HEALTH_URL);
	if (explicit) {
		return explicit;
	}

	const wsUrl = trimEnvUrl(process.env.VITE_WS_URL);
	if (wsUrl) {
		const derived = deriveHealthUrlFromWebSocketUrl(wsUrl);
		if (derived) {
			return derived;
		}
	}

	const protocol = window.location.protocol === "https:" ? "https" : "http";
	const backendPort = getBackendPort();
	if (backendPort) {
		return `${protocol}://${resolveServerHost()}:${backendPort}/health`;
	}
	return `${protocol}://${window.location.host}/health`;
}
