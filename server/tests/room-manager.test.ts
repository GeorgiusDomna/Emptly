import assert from "node:assert/strict";
import test from "node:test";
import { WebSocket } from "ws";
import { RoomManager } from "../src/domain/rooms/room-manager.js";

function createFakeSocket(): WebSocket {
	return {} as WebSocket;
}

test("RoomManager limits room to two participants", () => {
	const roomManager = new RoomManager();
	const socketA = createFakeSocket();
	const socketB = createFakeSocket();
	const socketC = createFakeSocket();

	const first = roomManager.join("room-1", { userId: "a", socket: socketA });
	const second = roomManager.join("room-1", { userId: "b", socket: socketB });
	const third = roomManager.join("room-1", { userId: "c", socket: socketC });

	assert.equal(first.full, false);
	assert.equal(second.full, false);
	assert.equal(third.full, true);
	assert.equal(roomManager.getParticipantSockets("room-1").length, 2);
});

test("RoomManager removes empty rooms after leave", () => {
	const roomManager = new RoomManager();
	const socketA = createFakeSocket();

	roomManager.join("room-2", { userId: "a", socket: socketA });
	const leaveResult = roomManager.leave("room-2", socketA);

	assert.equal(leaveResult?.participants, 0);
	assert.equal(roomManager.getParticipantSockets("room-2").length, 0);
});
