import { z } from "zod";

export const PROTOCOL_VERSION = "1.3";

const baseMessageSchema = z.object({
	type: z.string().min(1),
	roomId: z.string().min(1),
	userId: z.string().min(1),
	protocolVersion: z.literal(PROTOCOL_VERSION)
});

export const joinRoomSchema = baseMessageSchema.extend({
	type: z.literal("join_room")
});

export const leaveRoomSchema = baseMessageSchema.extend({
	type: z.literal("leave_room")
});

export const chatMessageSchema = baseMessageSchema.extend({
	type: z.literal("chat_message"),
	messageId: z.string().min(1),
	ciphertext: z.string().min(1),
	iv: z.string().min(1),
	sentAt: z.string().datetime()
});

export const handshakeHelloSchema = baseMessageSchema.extend({
	type: z.literal("handshake_hello"),
	handshakeSessionId: z.string().min(1),
	publicKey: z.string().min(1),
	proof: z.string().min(1)
});

export const handshakeFinishSchema = baseMessageSchema.extend({
	type: z.literal("handshake_finish"),
	handshakeSessionId: z.string().min(1),
	confirmation: z.string().min(1)
});

export const inboundEventSchema = z.discriminatedUnion("type", [
	joinRoomSchema,
	leaveRoomSchema,
	chatMessageSchema,
	handshakeHelloSchema,
	handshakeFinishSchema
]);

export type JoinRoomEvent = z.infer<typeof joinRoomSchema>;
export type LeaveRoomEvent = z.infer<typeof leaveRoomSchema>;
export type ChatMessageEvent = z.infer<typeof chatMessageSchema>;
export type HandshakeHelloEvent = z.infer<typeof handshakeHelloSchema>;
export type HandshakeFinishEvent = z.infer<typeof handshakeFinishSchema>;
export type InboundEvent = z.infer<typeof inboundEventSchema>;

export type OutboundErrorCode =
	| "INVALID_PAYLOAD"
	| "UNKNOWN_EVENT"
	| "ROOM_MISMATCH"
	| "HANDSHAKE_REQUIRED"
	| "HANDSHAKE_INVALID"
	| "ROOM_FULL"
	| "INTERNAL_ERROR";

export function buildErrorPayload(code: OutboundErrorCode, message: string): {
	type: "error";
	code: OutboundErrorCode;
	message: string;
	protocolVersion: typeof PROTOCOL_VERSION;
} {
	return {
		type: "error",
		code,
		message,
		protocolVersion: PROTOCOL_VERSION
	};
}
