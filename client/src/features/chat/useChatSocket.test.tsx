import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChatSocket } from "@/features/chat/useChatSocket";

const {
	createHandshakeHelloMock,
	createHandshakeSessionMock,
	decryptMessageMock,
	encryptMessageMock,
	verifyHandshakeHelloMock
} = vi.hoisted(() => ({
	createHandshakeHelloMock: vi.fn(),
	createHandshakeSessionMock: vi.fn(),
	decryptMessageMock: vi.fn(),
	encryptMessageMock: vi.fn(),
	verifyHandshakeHelloMock: vi.fn()
}));

vi.mock("@/features/chat/crypto", () => ({
	createHandshakeHello: createHandshakeHelloMock,
	createHandshakeSession: createHandshakeSessionMock,
	decryptMessage: decryptMessageMock,
	encryptMessage: encryptMessageMock,
	verifyHandshakeHello: verifyHandshakeHelloMock
}));

class MockWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;
	static instances: MockWebSocket[] = [];

	readonly url: string;
	readyState = MockWebSocket.CONNECTING;
	sent: string[] = [];
	onopen: ((this: WebSocket, ev: Event) => unknown) | null = null;
	onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null;
	onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null;
	onerror: ((this: WebSocket, ev: Event) => unknown) | null = null;

	constructor(url: string) {
		this.url = url;
		MockWebSocket.instances.push(this);
	}

	send(payload: string): void {
		this.sent.push(payload);
	}

	close(): void {
		if (this.readyState === MockWebSocket.CLOSED) {
			return;
		}
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.call(this as unknown as WebSocket, new CloseEvent("close"));
	}

	emitOpen(): void {
		this.readyState = MockWebSocket.OPEN;
		this.onopen?.call(this as unknown as WebSocket, new Event("open"));
	}

	emitMessage(payload: object): void {
		this.onmessage?.call(
			this as unknown as WebSocket,
			new MessageEvent("message", { data: JSON.stringify(payload) })
		);
	}
}

describe("useChatSocket", () => {
	beforeEach(() => {
		MockWebSocket.instances = [];
		vi.stubGlobal("WebSocket", MockWebSocket);
		createHandshakeHelloMock.mockReset();
		createHandshakeSessionMock.mockReset();
		decryptMessageMock.mockReset();
		encryptMessageMock.mockReset();
		verifyHandshakeHelloMock.mockReset();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("joins room and switches to waiting state when peer is absent", async () => {
		const roomId = "room1234";
		const roomKey = "a".repeat(43);
		const { result, unmount } = renderHook(() => useChatSocket(roomId, "u1", roomKey, true));

		const socket = MockWebSocket.instances[0];
		expect(socket).toBeDefined();

		act(() => {
			socket.emitOpen();
		});

		const joinPayload = JSON.parse(socket.sent[0] ?? "{}") as Record<string, unknown>;
		expect(joinPayload.type).toBe("join_room");
		expect(joinPayload.roomId).toBe(roomId);

		act(() => {
			socket.emitMessage({
				type: "room_joined",
				roomId,
				userId: "u1",
				participants: 1,
				handshakeSessionId: "session-1",
				protocolVersion: "1.4"
			});
		});

		await waitFor(() => {
			expect(result.current.status).toBe("waiting_peer");
			expect(result.current.participants).toBe(1);
		});

		unmount();
	});

	it("marks connection as full when server rejects third participant", async () => {
		const roomId = "room9999";
		const roomKey = "b".repeat(43);
		const { result } = renderHook(() => useChatSocket(roomId, "u3", roomKey, true));

		const socket = MockWebSocket.instances[0];
		expect(socket).toBeDefined();

		act(() => {
			socket.emitOpen();
			socket.emitMessage({
				type: "room_full",
				roomId,
				code: "ROOM_FULL",
				message: "Комната уже занята двумя пользователями",
				protocolVersion: "1.4"
			});
		});

		await waitFor(() => {
			expect(result.current.status).toBe("room_full");
			expect(result.current.errorText).toBe("Комната уже занята двумя пользователями");
		});
	});
});
