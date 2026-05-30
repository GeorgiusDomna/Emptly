import { randomUUID } from "node:crypto";
import type { WebSocket } from "ws";

export type ConnectionMeta = {
	connectionId: string;
	isAlive: boolean;
	roomId: string | null;
	userId: string | null;
};

export class ConnectionRegistry {
	private readonly map = new Map<WebSocket, ConnectionMeta>();

	create(socket: WebSocket): ConnectionMeta {
		const meta: ConnectionMeta = {
			connectionId: randomUUID(),
			isAlive: true,
			roomId: null,
			userId: null
		};
		this.map.set(socket, meta);
		return meta;
	}

	get(socket: WebSocket): ConnectionMeta | undefined {
		return this.map.get(socket);
	}

	setAlive(socket: WebSocket, isAlive: boolean): void {
		const meta = this.map.get(socket);
		if (!meta) {
			return;
		}
		meta.isAlive = isAlive;
	}

	assignRoom(socket: WebSocket, roomId: string, userId: string): void {
		const meta = this.map.get(socket);
		if (!meta) {
			return;
		}
		meta.roomId = roomId;
		meta.userId = userId;
	}

	clearRoom(socket: WebSocket): void {
		const meta = this.map.get(socket);
		if (!meta) {
			return;
		}
		meta.roomId = null;
		meta.userId = null;
	}

	delete(socket: WebSocket): void {
		this.map.delete(socket);
	}

	entries(): Array<[WebSocket, ConnectionMeta]> {
		return [...this.map.entries()];
	}
}
