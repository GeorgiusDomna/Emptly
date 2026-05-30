import type { WebSocket } from "ws";

const MAX_PARTICIPANTS = 2;

export type RoomParticipant = {
	userId: string;
	socket: WebSocket;
};

type RoomState = {
	roomId: string;
	lastActivityAt: number;
	participants: Map<WebSocket, RoomParticipant>;
};

export class RoomManager {
	private readonly rooms = new Map<string, RoomState>();

	join(roomId: string, participant: RoomParticipant): { full: boolean; participants: number } {
		const room = this.getOrCreateRoom(roomId);
		const existing = room.participants.get(participant.socket);
		if (existing) {
			room.lastActivityAt = Date.now();
			return { full: false, participants: room.participants.size };
		}

		if (room.participants.size >= MAX_PARTICIPANTS) {
			return { full: true, participants: room.participants.size };
		}

		room.participants.set(participant.socket, participant);
		room.lastActivityAt = Date.now();
		return { full: false, participants: room.participants.size };
	}

	leave(roomId: string, socket: WebSocket): { leftUserId: string; participants: number } | null {
		const room = this.rooms.get(roomId);
		if (!room) {
			return null;
		}

		const participant = room.participants.get(socket);
		if (!participant) {
			return null;
		}

		room.participants.delete(socket);
		room.lastActivityAt = Date.now();
		const participants = room.participants.size;
		if (participants === 0) {
			this.rooms.delete(roomId);
		}

		return { leftUserId: participant.userId, participants };
	}

	touch(roomId: string): void {
		const room = this.rooms.get(roomId);
		if (room) {
			room.lastActivityAt = Date.now();
		}
	}

	getParticipantSockets(roomId: string): WebSocket[] {
		const room = this.rooms.get(roomId);
		if (!room) {
			return [];
		}

		return [...room.participants.keys()];
	}

	getExpiredRoomIds(nowMs: number, ttlMs: number): string[] {
		const expired: string[] = [];
		for (const [roomId, room] of this.rooms) {
			if (nowMs - room.lastActivityAt >= ttlMs) {
				expired.push(roomId);
			}
		}
		return expired;
	}

	removeRoom(roomId: string): void {
		this.rooms.delete(roomId);
	}

	private getOrCreateRoom(roomId: string): RoomState {
		const existing = this.rooms.get(roomId);
		if (existing) {
			return existing;
		}

		const created: RoomState = {
			roomId,
			lastActivityAt: Date.now(),
			participants: new Map()
		};
		this.rooms.set(roomId, created);
		return created;
	}
}
