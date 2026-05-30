import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { DraftRoomSnapshot, RoomConnectionSnapshot } from "@/features/chat/types";

type ConnectionStatusContextValue = {
	roomConnection: RoomConnectionSnapshot | null;
	setRoomConnection: (connection: RoomConnectionSnapshot | null) => void;
	draftRoom: DraftRoomSnapshot | null;
	setDraftRoom: (draft: DraftRoomSnapshot | null) => void;
};

const ConnectionStatusContext = createContext<ConnectionStatusContextValue | null>(null);

export function ConnectionStatusProvider({ children }: { children: ReactNode }) {
	const [roomConnection, setRoomConnection] = useState<RoomConnectionSnapshot | null>(null);
	const [draftRoom, setDraftRoom] = useState<DraftRoomSnapshot | null>(null);
	const value = useMemo(
		() => ({
			roomConnection,
			setRoomConnection,
			draftRoom,
			setDraftRoom
		}),
		[roomConnection, draftRoom]
	);

	return <ConnectionStatusContext.Provider value={value}>{children}</ConnectionStatusContext.Provider>;
}

export function useConnectionStatusContext(): ConnectionStatusContextValue {
	const context = useContext(ConnectionStatusContext);
	if (!context) {
		throw new Error("useConnectionStatusContext must be used within ConnectionStatusProvider");
	}
	return context;
}

export function useRoomConnection(): RoomConnectionSnapshot | null {
	return useConnectionStatusContext().roomConnection;
}

export function useDraftRoom(): DraftRoomSnapshot | null {
	return useConnectionStatusContext().draftRoom;
}
