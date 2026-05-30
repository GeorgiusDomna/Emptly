export type ConnectionStatus =
	| "connecting"
	| "waiting_peer"
	| "connected"
	| "reconnecting"
	| "failed"
	| "room_full";

export type WebSocketTransportMode = "ws" | "wss";

export type RoomConnectionSnapshot = {
	status: ConnectionStatus;
	statusText: string;
	errorText: string | null;
	participants: number;
	roomId: string;
	reconnect: () => void;
	preferredTransport: WebSocketTransportMode;
	activeTransport: WebSocketTransportMode | null;
	activeWsUrl: string | null;
	transportFallbackActive: boolean;
};

export type DraftRoomSnapshot = {
	roomId: string;
	statusText: string;
};
