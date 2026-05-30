import type { WebSocket } from "ws";

type RateLimitState = {
	windowStartedAt: number;
	eventsInWindow: number;
};

export class SocketRateLimiter {
	private readonly states = new Map<WebSocket, RateLimitState>();

	constructor(
		private readonly windowMs: number,
		private readonly maxEventsPerWindow: number
	) {}

	consume(socket: WebSocket, nowMs: number): boolean {
		const existing = this.states.get(socket);
		if (!existing) {
			this.states.set(socket, { windowStartedAt: nowMs, eventsInWindow: 1 });
			return true;
		}

		if (nowMs - existing.windowStartedAt >= this.windowMs) {
			existing.windowStartedAt = nowMs;
			existing.eventsInWindow = 1;
			return true;
		}

		if (existing.eventsInWindow >= this.maxEventsPerWindow) {
			return false;
		}

		existing.eventsInWindow += 1;
		return true;
	}

	clear(socket: WebSocket): void {
		this.states.delete(socket);
	}
}
