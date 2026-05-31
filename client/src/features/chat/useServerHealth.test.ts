import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { PROTOCOL_VERSION } from "@/lib/server";

const { resolveHealthUrlForTransportMock, swapHealthTransportMock, canFallbackToInsecureWebSocketMock } =
	vi.hoisted(() => ({
		resolveHealthUrlForTransportMock: vi.fn(),
		swapHealthTransportMock: vi.fn(),
		canFallbackToInsecureWebSocketMock: vi.fn()
	}));

vi.mock("@/lib/transport", () => ({
	resolveHealthUrlForTransport: resolveHealthUrlForTransportMock,
	swapHealthTransport: swapHealthTransportMock,
	canFallbackToInsecureWebSocket: canFallbackToInsecureWebSocketMock
}));

describe("useServerHealth", () => {
	beforeEach(() => {
		Object.defineProperty(window, "location", {
			configurable: true,
			value: {
				protocol: "https:",
				host: "chat.example.com"
			}
		});
		resolveHealthUrlForTransportMock.mockReturnValue("https://chat.example.com:5001/health");
		swapHealthTransportMock.mockReturnValue("http://chat.example.com:5001/health");
		canFallbackToInsecureWebSocketMock.mockReturnValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.resetModules();
	});

	it("tries same-origin /health before direct backend port", async () => {
		const fetchMock = vi
			.fn()
			.mockRejectedValueOnce(new TypeError("Failed to fetch"))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ status: "ok", protocolVersion: PROTOCOL_VERSION })
			});
		vi.stubGlobal("fetch", fetchMock);

		const { useServerHealth } = await import("@/features/chat/useServerHealth");
		const { result } = renderHook(() => useServerHealth());

		await waitFor(() => {
			expect(result.current.state).toBe("online");
		});

		expect(fetchMock).toHaveBeenNthCalledWith(
			1,
			"/health",
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"https://chat.example.com:5001/health",
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(result.current.activeHealthUrl).toBe("https://chat.example.com:5001/health");
	});
});
