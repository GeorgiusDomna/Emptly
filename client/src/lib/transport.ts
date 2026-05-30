import {
	resolveHealthUrl,
	resolveWebSocketTransport,
	resolveWsUrl,
	type WebSocketTransport
} from "@/lib/server";

export const WSS_ATTEMPTS_BEFORE_WS_FALLBACK = 4;
export const WS_ATTEMPTS_AFTER_FALLBACK = 4;
export const WSS_ATTEMPTS_WHEN_NO_FALLBACK = 8;

export type HealthTransport = "https" | "http";

export function swapWebSocketTransport(url: string, transport: WebSocketTransport): string | null {
	try {
		const parsed = new URL(url);
		parsed.protocol = transport === "wss" ? "wss:" : "ws:";
		return parsed.toString();
	} catch {
		return null;
	}
}

export function swapHealthTransport(url: string, transport: HealthTransport): string | null {
	try {
		const parsed = new URL(url);
		parsed.protocol = transport === "https" ? "https:" : "http:";
		return parsed.toString();
	} catch {
		return null;
	}
}

export function getPreferredWebSocketTransport(): WebSocketTransport {
	return resolveWebSocketTransport();
}

export function canFallbackToInsecureWebSocket(): boolean {
	if (getPreferredWebSocketTransport() !== "wss") {
		return false;
	}

	if (typeof window !== "undefined" && window.location.protocol === "https:") {
		return false;
	}

	return swapWebSocketTransport(resolveWsUrl(), "ws") !== null;
}

export function resolveWebSocketUrlForTransport(transport: WebSocketTransport): string {
	const preferredUrl = resolveWsUrl();
	const preferredTransport = getPreferredWebSocketTransport();
	if (transport === preferredTransport) {
		return preferredUrl;
	}

	return swapWebSocketTransport(preferredUrl, transport) ?? preferredUrl;
}

export function resolveHealthUrlForTransport(transport: HealthTransport): string {
	const preferredUrl = resolveHealthUrl();
	const preferredTransport: HealthTransport = preferredUrl.startsWith("https://") ? "https" : "http";
	if (transport === preferredTransport) {
		return preferredUrl;
	}

	return swapHealthTransport(preferredUrl, transport) ?? preferredUrl;
}

export function getInitialWebSocketTransportMode(): WebSocketTransport {
	return getPreferredWebSocketTransport();
}

export function getTransportPresentation(
	transport: WebSocketTransport,
	options?: { fallbackActive?: boolean; preferred?: WebSocketTransport }
): { label: string; hint: string; secured: boolean } {
	const preferred = options?.preferred ?? getPreferredWebSocketTransport();
	const fallbackActive = options?.fallbackActive ?? false;

	if (transport === "wss") {
		return { label: "WSS", hint: "TLS на транспорте", secured: true };
	}

	if (fallbackActive && preferred === "wss") {
		return {
			label: "WS",
			hint: "WSS недоступен, используем WS",
			secured: false
		};
	}

	return { label: "WS", hint: "без TLS на транспорте", secured: false };
}
