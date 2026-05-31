import { useCallback, useEffect, useState } from "react";
import { PROTOCOL_VERSION } from "@/lib/server";
import {
	canFallbackToInsecureWebSocket,
	resolveHealthUrlForTransport,
	swapHealthTransport
} from "@/lib/transport";
import { resolveHealthUrl } from "@/lib/server";
import type { HealthTransport } from "@/lib/transport";

export type ServerHealthState = "checking" | "online" | "offline";

export type ServerStatusSnapshot = {
	state: ServerHealthState;
	lastCheckedAt: Date | null;
};

const HEALTH_POLL_MS = 30_000;
const HEALTH_TIMEOUT_MS = 5_000;

type HealthResponse = {
	status?: string;
	protocolVersion?: string;
};

function getPreferredHealthTransport(): HealthTransport {
	return resolveHealthUrl().startsWith("https://") ? "https" : "http";
}

const RELATIVE_HEALTH_URL = "/health";

function isSameOriginAsPage(url: string): boolean {
	try {
		return new URL(url, window.location.origin).origin === window.location.origin;
	} catch {
		return false;
	}
}

function buildHealthCandidateUrls(
	primaryUrl: string,
	transportFallbackUrl: string | null,
	preferredTransport: HealthTransport
): string[] {
	const candidates = [RELATIVE_HEALTH_URL];

	const maybeAdd = (url: string | null) => {
		if (!url || candidates.includes(url)) {
			return;
		}

		if (url === RELATIVE_HEALTH_URL || isSameOriginAsPage(url)) {
			return;
		}

		candidates.push(url);
	};

	maybeAdd(primaryUrl);

	if (
		transportFallbackUrl &&
		preferredTransport === "https" &&
		canFallbackToInsecureWebSocket()
	) {
		maybeAdd(transportFallbackUrl);
	}

	return candidates;
}

async function fetchHealth(url: string): Promise<boolean> {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS)
	});

	if (!response.ok) {
		return false;
	}

	const payload = (await response.json()) as HealthResponse;
	if (payload.status !== "ok") {
		return false;
	}

	if (payload.protocolVersion && payload.protocolVersion !== PROTOCOL_VERSION) {
		return false;
	}

	return true;
}

async function tryHealthUrls(urls: string[]): Promise<string | null> {
	const seen = new Set<string>();

	for (const url of urls) {
		if (seen.has(url)) {
			continue;
		}
		seen.add(url);

		try {
			if (await fetchHealth(url)) {
				return url;
			}
		} catch {
			// try next candidate
		}
	}

	return null;
}

export function useServerHealth() {
	const [state, setState] = useState<ServerHealthState>("checking");
	const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
	const [activeHealthUrl, setActiveHealthUrl] = useState<string | null>(null);
	const [activeHealthTransport, setActiveHealthTransport] = useState<HealthTransport | null>(null);
	const [healthFallbackActive, setHealthFallbackActive] = useState(false);

	const check = useCallback(async (options?: { silent?: boolean }) => {
		if (!options?.silent) {
			setState("checking");
		}

		const preferredTransport = getPreferredHealthTransport();
		const primaryUrl = resolveHealthUrlForTransport(preferredTransport);
		const fallbackTransport: HealthTransport = preferredTransport === "https" ? "http" : "https";
		const transportFallbackUrl = swapHealthTransport(primaryUrl, fallbackTransport);
		const candidateUrls = buildHealthCandidateUrls(primaryUrl, transportFallbackUrl, preferredTransport);

		const healthyUrl = await tryHealthUrls(candidateUrls);
		if (healthyUrl) {
			const usedTransport: HealthTransport = healthyUrl.startsWith("https://") ? "https" : "http";
			setState("online");
			setActiveHealthUrl(healthyUrl);
			setActiveHealthTransport(usedTransport);
			setHealthFallbackActive(
				usedTransport === "http" &&
					preferredTransport === "https" &&
					healthyUrl !== RELATIVE_HEALTH_URL &&
					!isSameOriginAsPage(healthyUrl)
			);
			setLastCheckedAt(new Date());
			return;
		}

		setState("offline");
		setActiveHealthUrl(null);
		setActiveHealthTransport(null);
		setHealthFallbackActive(false);
		setLastCheckedAt(new Date());
	}, []);

	useEffect(() => {
		void check();

		const timerId = window.setInterval(() => {
			void check({ silent: true });
		}, HEALTH_POLL_MS);

		return () => {
			window.clearInterval(timerId);
		};
	}, [check]);

	return {
		state,
		lastCheckedAt,
		check,
		activeHealthUrl,
		activeHealthTransport,
		healthFallbackActive
	};
}
