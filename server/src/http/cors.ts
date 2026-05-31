import type { IncomingMessage, ServerResponse } from "node:http";

export function parseAllowedOrigins(corsOrigin: string | null): string[] {
	if (!corsOrigin) {
		return [];
	}

	return corsOrigin
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

export function isOriginAllowed(origin: string, corsOrigin: string | null): boolean {
	return parseAllowedOrigins(corsOrigin).includes(origin);
}

export function applyCorsHeaders(
	req: IncomingMessage,
	res: ServerResponse,
	corsOrigin: string | null
): boolean {
	const origin = req.headers.origin;
	if (!origin || !isOriginAllowed(origin, corsOrigin)) {
		return false;
	}

	res.setHeader("Access-Control-Allow-Origin", origin);
	res.setHeader("Vary", "Origin");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");
	return true;
}

export function handleCorsPreflight(
	req: IncomingMessage,
	res: ServerResponse,
	corsOrigin: string | null
): boolean {
	if (req.method !== "OPTIONS") {
		return false;
	}

	applyCorsHeaders(req, res, corsOrigin);
	res.writeHead(204);
	res.end();
	return true;
}
