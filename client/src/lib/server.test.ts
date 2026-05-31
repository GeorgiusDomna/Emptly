import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveHealthUrl", () => {
	beforeEach(() => {
		vi.stubGlobal("window", {
			location: {
				protocol: "https:",
				hostname: "chat.example.com",
				host: "chat.example.com"
			}
		});
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it("uses same-origin /health when BACKEND_PORT is not set", async () => {
		vi.stubEnv("BACKEND_PORT", "");
		vi.stubEnv("VITE_WS_URL", "");
		vi.stubEnv("VITE_HEALTH_URL", "");

		const { resolveHealthUrl } = await import("@/lib/server");
		expect(resolveHealthUrl()).toBe("https://chat.example.com/health");
	});

	it("derives /health from explicit VITE_WS_URL when health URL is omitted", async () => {
		vi.stubEnv("BACKEND_PORT", "5001");
		vi.stubEnv("VITE_WS_URL", "wss://chat.example.com/ws");
		vi.stubEnv("VITE_HEALTH_URL", "");

		const { resolveHealthUrl } = await import("@/lib/server");
		expect(resolveHealthUrl()).toBe("https://chat.example.com/health");
	});

	it("uses BACKEND_PORT when it is configured for local development", async () => {
		vi.stubEnv("BACKEND_PORT", "5001");
		vi.stubEnv("VITE_WS_URL", "");
		vi.stubEnv("VITE_HEALTH_URL", "");

		const { resolveHealthUrl } = await import("@/lib/server");
		expect(resolveHealthUrl()).toBe("https://chat.example.com:5001/health");
	});
});
