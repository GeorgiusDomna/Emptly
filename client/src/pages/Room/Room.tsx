import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { setChatComposerOffsetPx } from "@/lib/chat-composer";
import { MessageList } from "@/shared/components/message-list/MessageList";
import { TypingIndicator } from "@/shared/components/message-list/TypingIndicator";
import { DialogInput } from "@/shared/components/dialog-input/DialogInput";
import { useParams } from "react-router-dom";
import {
	buildRoomInviteLink,
	getOrCreateUserId,
	getRoomKeyFromLocationHash,
	isValidRoomId,
	setDraftRoomKey,
	setDraftRoomId
} from "@/lib/room";
import { useConnectionStatusContext } from "@/features/chat/connection-status-context";
import { useChatSocket } from "@/features/chat/useChatSocket";
import { toast } from "sonner";
import { RoomHeader } from "@/pages/Room/RoomHeader";

const Room = () => {
	const { roomID } = useParams<{ roomID: string }>();
	const [text, setText] = useState("");
	const userId = useMemo(() => getOrCreateUserId(), []);
	const validRoomId = typeof roomID === "string" && isValidRoomId(roomID) ? roomID : null;
	const roomKey = useMemo(() => getRoomKeyFromLocationHash(window.location.hash), []);
	const composerDockRef = useRef<HTMLDivElement>(null);
	const [composerOffsetRevision, setComposerOffsetRevision] = useState(0);

	useLayoutEffect(() => {
		const dock = composerDockRef.current;
		if (!dock) {
			return;
		}

		const updateOffset = () => {
			setChatComposerOffsetPx(dock.getBoundingClientRect().height);
			setComposerOffsetRevision((revision) => revision + 1);
		};

		updateOffset();

		const observer = new ResizeObserver(updateOffset);
		observer.observe(dock);

		return () => {
			observer.disconnect();
		};
	}, []);

	const {
		status,
		statusText,
		errorText,
		messages,
		sendMessage,
		notifyComposerActivity,
		peerIsTyping,
		participants,
		reconnect,
		preferredTransport,
		activeTransport,
		activeWsUrl,
		transportFallbackActive
	} = useChatSocket(
		validRoomId ?? "",
		userId,
		roomKey,
		Boolean(validRoomId && roomKey)
	);
	const { setRoomConnection } = useConnectionStatusContext();

	useEffect(() => {
		setComposerOffsetRevision((revision) => revision + 1);
	}, [peerIsTyping]);

	useEffect(() => {
		if (!validRoomId) {
			setRoomConnection(null);
			return;
		}

		setDraftRoomId(validRoomId);
		if (roomKey) {
			setDraftRoomKey(roomKey);
		}

		setRoomConnection({
			status,
			statusText,
			errorText,
			participants,
			roomId: validRoomId,
			reconnect,
			preferredTransport,
			activeTransport,
			activeWsUrl,
			transportFallbackActive
		});

		return () => {
			setRoomConnection(null);
		};
	}, [
		validRoomId,
		status,
		statusText,
		errorText,
		participants,
		reconnect,
		preferredTransport,
		activeTransport,
		activeWsUrl,
		transportFallbackActive,
		setRoomConnection
	]);

	const canSend = status === "connected" || status === "waiting_peer";

	useEffect(() => {
		notifyComposerActivity(text);
	}, [text, notifyComposerActivity]);

	const handleSubmit = () => {
		sendMessage(text);
		setText("");
	};

	const handleCopyRoomLink = async () => {
		if (!validRoomId) {
			return;
		}

		try {
			const link = roomKey
				? buildRoomInviteLink(validRoomId, roomKey)
				: `${window.location.origin}/room/${validRoomId}/`;
			await navigator.clipboard.writeText(link);
			toast.success("Ссылка на комнату скопирована");
		} catch {
			toast.error("Не удалось скопировать ссылку");
		}
	};

	return (
		<section
			className="mx-auto flex w-full max-w-4xl flex-col gap-4"
			style={{ paddingBottom: "var(--chat-composer-offset)" }}
		>
			<RoomHeader
				roomId={validRoomId}
				status={status}
				statusText={statusText}
				errorText={errorText}
				participants={participants}
				onCopyRoomLink={handleCopyRoomLink}
			/>

			<MessageList list={messages} scrollRevision={composerOffsetRevision} />

			<div
				ref={composerDockRef}
				className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-background/75 from-25% via-background/35 to-transparent px-4 pb-4 pt-10 sm:px-6 sm:pb-6"
			>
				<div className="pointer-events-auto w-full max-w-4xl space-y-2">
					{peerIsTyping ? <TypingIndicator /> : null}
					<DialogInput value={text} onChange={setText} onSubmit={handleSubmit} disabled={!canSend} />
				</div>
			</div>
		</section>
	);
};

export default Room;
