const ROOM_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const ROOM_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ROOM_ACCESS_CODE_PATTERN = /^[A-Za-z0-9_-]{12}$/;
const USER_ID_STORAGE_KEY = "private-chat-user-id";
const DRAFT_ROOM_ID_STORAGE_KEY = "private-chat-draft-room-id";
const DRAFT_ROOM_KEY_STORAGE_KEY = "private-chat-draft-room-key";
const ROOM_ACCESS_CODE_PREFIX = "private-chat-room-access-code:";

export function generateRoomId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID().replace(/-/g, "");
	}

	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function parseRoomId(input: string): string | null {
	return parseRoomTarget(input)?.roomId ?? null;
}

export function isValidRoomId(roomId: string): boolean {
	return ROOM_ID_PATTERN.test(roomId);
}

export function isValidRoomKey(roomKey: string): boolean {
	return ROOM_KEY_PATTERN.test(roomKey);
}

export function generateRoomKey(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return toBase64Url(bytes);
}

export function generateRoomAccessCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(9));
	return toBase64Url(bytes).slice(0, 12);
}

export function normalizeRoomAccessCode(input: string): string {
	return input.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12);
}

export function isValidRoomAccessCode(accessCode: string): boolean {
	return ROOM_ACCESS_CODE_PATTERN.test(accessCode);
}

export function setRoomAccessCode(roomId: string, accessCode: string): void {
	if (!isValidRoomId(roomId)) {
		return;
	}
	const normalized = normalizeRoomAccessCode(accessCode);
	if (!isValidRoomAccessCode(normalized)) {
		return;
	}
	sessionStorage.setItem(getRoomAccessCodeKey(roomId), normalized);
}

export function getRoomAccessCode(roomId: string): string | null {
	if (!isValidRoomId(roomId)) {
		return null;
	}
	const existing = sessionStorage.getItem(getRoomAccessCodeKey(roomId));
	if (!existing || !isValidRoomAccessCode(existing)) {
		return null;
	}
	return existing;
}

export function getRoomKeyFromLocationHash(hash: string): string | null {
	const hashValue = hash.startsWith("#") ? hash.slice(1) : hash;
	const params = new URLSearchParams(hashValue);
	const roomKey = params.get("k");
	if (!roomKey || !isValidRoomKey(roomKey)) {
		return null;
	}
	return roomKey;
}

export function buildRoomInviteLink(roomId: string, roomKey: string): string {
	return `${window.location.origin}/room/${roomId}/#k=${roomKey}`;
}

export function parseRoomTarget(input: string): { roomId: string; roomKey: string | null } | null {
	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	const fromPath = extractRoomFromUrlOrPath(trimmed);
	if (fromPath) {
		return fromPath;
	}

	if (ROOM_ID_PATTERN.test(trimmed)) {
		return { roomId: trimmed, roomKey: null };
	}

	return null;
}

export function getOrCreateDraftRoomId(): string {
	const existing = sessionStorage.getItem(DRAFT_ROOM_ID_STORAGE_KEY);
	if (existing && isValidRoomId(existing)) {
		return existing;
	}

	const roomId = generateRoomId();
	sessionStorage.setItem(DRAFT_ROOM_ID_STORAGE_KEY, roomId);
	return roomId;
}

export function setDraftRoomId(roomId: string): void {
	if (isValidRoomId(roomId)) {
		sessionStorage.setItem(DRAFT_ROOM_ID_STORAGE_KEY, roomId);
	}
}

export function getOrCreateDraftRoomKey(): string {
	const existing = sessionStorage.getItem(DRAFT_ROOM_KEY_STORAGE_KEY);
	if (existing && isValidRoomKey(existing)) {
		return existing;
	}

	const roomKey = generateRoomKey();
	sessionStorage.setItem(DRAFT_ROOM_KEY_STORAGE_KEY, roomKey);
	return roomKey;
}

export function setDraftRoomKey(roomKey: string): void {
	if (isValidRoomKey(roomKey)) {
		sessionStorage.setItem(DRAFT_ROOM_KEY_STORAGE_KEY, roomKey);
	}
}

export function getOrCreateUserId(): string {
	const existing = sessionStorage.getItem(USER_ID_STORAGE_KEY);
	if (existing) {
		return existing;
	}

	const userId = `u_${generateRoomId().slice(0, 12)}`;
	sessionStorage.setItem(USER_ID_STORAGE_KEY, userId);
	return userId;
}

function extractRoomFromUrlOrPath(input: string): { roomId: string; roomKey: string | null } | null {
	try {
		const url = new URL(input);
		const parts = url.pathname.split("/").filter(Boolean);
		const roomIndex = parts.findIndex((part) => part === "room");
		if (roomIndex === -1) {
			return null;
		}

		const roomId = parts[roomIndex + 1] ?? "";
		if (!ROOM_ID_PATTERN.test(roomId)) {
			return null;
		}
		return { roomId, roomKey: getRoomKeyFromLocationHash(url.hash) };
	} catch {
		return null;
	}
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getRoomAccessCodeKey(roomId: string): string {
	return `${ROOM_ACCESS_CODE_PREFIX}${roomId}`;
}
