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

		try {
			if (await fetchHealth(primaryUrl)) {
				setState("online");
				setActiveHealthUrl(primaryUrl);
				setActiveHealthTransport(preferredTransport);
				setHealthFallbackActive(false);
				setLastCheckedAt(new Date());
				return;
			}
		} catch {
			// try fallback below
		}

		const fallbackTransport: HealthTransport = preferredTransport === "https" ? "http" : "https";
		const fallbackUrl = swapHealthTransport(primaryUrl, fallbackTransport);

		if (fallbackUrl && preferredTransport === "https" && canFallbackToInsecureWebSocket()) {
			try {
				if (await fetchHealth(fallbackUrl)) {
					setState("online");
					setActiveHealthUrl(fallbackUrl);
					setActiveHealthTransport("http");
					setHealthFallbackActive(true);
					setLastCheckedAt(new Date());
					return;
				}
			} catch {
				// fall through to offline
			}
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
