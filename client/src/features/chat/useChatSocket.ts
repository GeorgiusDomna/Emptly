import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatViewMessage } from "@/shared/components/message-list/types";
import type { ConnectionStatus } from "@/features/chat/types";
import { PROTOCOL_VERSION } from "@/lib/server";
import {
	canFallbackToInsecureWebSocket,
	getInitialWebSocketTransportMode,
	getPreferredWebSocketTransport,
	resolveWebSocketUrlForTransport,
	WSS_ATTEMPTS_BEFORE_WS_FALLBACK,
	WSS_ATTEMPTS_WHEN_NO_FALLBACK,
	WS_ATTEMPTS_AFTER_FALLBACK
} from "@/lib/transport";
import type { WebSocketTransportMode } from "@/features/chat/types";
import {
	createHandshakeHello,
	createHandshakeSession,
	decryptMessage,
	encryptMessage,
	verifyHandshakeHello
} from "@/features/chat/crypto";

type ServerErrorCode =
	| "INVALID_PAYLOAD"
	| "UNKNOWN_EVENT"
	| "ROOM_MISMATCH"
	| "HANDSHAKE_REQUIRED"
	| "HANDSHAKE_INVALID"
	| "RATE_LIMITED"
	| "ROOM_FULL"
	| "INTERNAL_ERROR";

type ServerEvent =
	| {
			type: "room_joined";
			roomId: string;
			userId: string;
			participants: number;
			handshakeSessionId: string;
			protocolVersion: string;
	  }
	| {
			type: "peer_joined";
			roomId: string;
			userId: string;
			participants: number;
			handshakeSessionId: string;
			protocolVersion: string;
	  }
	| {
			type: "new_message";
			roomId: string;
			messageId: string;
			userId: string;
			ciphertext: string;
			iv: string;
			sentAt: string;
			protocolVersion: string;
	  }
	| {
			type: "handshake_peer_hello";
			roomId: string;
			userId: string;
			handshakeSessionId: string;
			publicKey: string;
			proof: string;
			protocolVersion: string;
	  }
	| {
			type: "handshake_peer_finish";
			roomId: string;
			userId: string;
			handshakeSessionId: string;
			confirmation: string;
			protocolVersion: string;
	  }
	| {
			type: "handshake_ready";
			roomId: string;
			handshakeSessionId: string;
			protocolVersion: string;
	  }
	| {
			type: "peer_left";
			roomId: string;
			userId: string;
			participants: number;
			protocolVersion: string;
	  }
	| {
			type: "peer_typing";
			roomId: string;
			userId: string;
			active: boolean;
			protocolVersion: string;
	  }
	| {
			type: "room_full";
			roomId: string;
			code: "ROOM_FULL";
			message: string;
			protocolVersion: string;
	  }
	| {
			type: "error";
			code: ServerErrorCode;
			message: string;
			protocolVersion: string;
	  };

type UseChatSocketResult = {
	status: ConnectionStatus;
	statusText: string;
	errorText: string | null;
	messages: ChatViewMessage[];
	sendMessage: (text: string) => void;
	notifyComposerActivity: (draft: string) => void;
	peerIsTyping: boolean;
	participants: number;
	reconnect: () => void;
	preferredTransport: WebSocketTransportMode;
	activeTransport: WebSocketTransportMode | null;
	activeWsUrl: string | null;
	transportFallbackActive: boolean;
};

const RECONNECT_DELAY_MS = 1200;
const TYPING_IDLE_MS = 2_500;
const PEER_TYPING_TIMEOUT_MS = 4_000;

function disposeSocket(socket: WebSocket): void {
	socket.onopen = null;
	socket.onmessage = null;
	socket.onclose = null;
	socket.onerror = null;
	if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
		socket.close();
	}
}

function buildConnectionErrorMessage(options: {
	preferredTransport: WebSocketTransportMode;
	fallbackAttempted: boolean;
}): string {
	if (options.preferredTransport === "wss" && !options.fallbackAttempted) {
		return "Не удалось подключиться по WSS. Проверьте, что backend запущен с TLS (npm run dev:secure), и откройте https://localhost:5001/health в браузере, чтобы принять сертификат.";
	}

	if (options.fallbackAttempted) {
		return "Не удалось подключиться ни по WSS, ни по WS. Проверьте, что backend запущен (npm run dev или npm run dev:secure) и client/.env указывает на правильный порт.";
	}

	return "Не удалось подключиться к серверу. Проверьте, что backend запущен и URL в client/.env совпадает с режимом сервера (ws или wss).";
}

export type { ConnectionStatus };

export function useChatSocket(
	roomId: string,
	userId: string,
	roomKey: string | null,
	enabled = true
): UseChatSocketResult {
	const [status, setStatus] = useState<ConnectionStatus>("connecting");
	const [errorText, setErrorText] = useState<string | null>(null);
	const [participants, setParticipants] = useState(0);
	const [messages, setMessages] = useState<ChatViewMessage[]>([]);
	const socketRef = useRef<WebSocket | null>(null);
	const roomCryptoKeyRef = useRef<CryptoKey | null>(null);
	const manualCloseRef = useRef(false);
	const reconnectTimerRef = useRef<number | null>(null);
	const handshakeRef = useRef<{
		privateKey: CryptoKey;
		publicKey: string;
		proof: string;
		helloSent: boolean;
		finishSent: boolean;
		peerFinishVerified: boolean;
		serverReady: boolean;
		expectedConfirmation: string | null;
	} | null>(null);
	const pendingPeerHelloRef = useRef<{ userId: string; publicKey: string; proof: string } | null>(null);
	const pendingPeerFinishRef = useRef<string | null>(null);
	const handshakeSessionIdRef = useRef<string | null>(null);
	const transportModeRef = useRef<WebSocketTransportMode>(getInitialWebSocketTransportMode());
	const secureFailureCountRef = useRef(0);
	const insecureFailureCountRef = useRef(0);
	const connectRef = useRef<() => void>(() => undefined);
	const [handshakeText, setHandshakeText] = useState<string | null>(null);
	const [activeTransport, setActiveTransport] = useState<WebSocketTransportMode | null>(null);
	const [activeWsUrl, setActiveWsUrl] = useState<string | null>(null);
	const [transportFallbackActive, setTransportFallbackActive] = useState(false);
	const [transportStatusHint, setTransportStatusHint] = useState<string | null>(null);
	const [peerIsTyping, setPeerIsTyping] = useState(false);
	const localTypingActiveRef = useRef(false);
	const typingIdleTimerRef = useRef<number | null>(null);
	const peerTypingTimeoutRef = useRef<number | null>(null);
	const preferredTransport = useMemo(() => getPreferredWebSocketTransport(), []);

	const resetTransportState = useCallback(() => {
		transportModeRef.current = getInitialWebSocketTransportMode();
		secureFailureCountRef.current = 0;
		insecureFailureCountRef.current = 0;
		setTransportFallbackActive(false);
		setActiveTransport(null);
		setActiveWsUrl(null);
		setTransportStatusHint(null);
	}, []);

	const scheduleReconnect = useCallback(() => {
		if (manualCloseRef.current) {
			return;
		}

		setStatus("reconnecting");
		setErrorText(null);
		if (reconnectTimerRef.current !== null) {
			window.clearTimeout(reconnectTimerRef.current);
		}
		reconnectTimerRef.current = window.setTimeout(() => {
			connectRef.current();
		}, RECONNECT_DELAY_MS);
	}, []);

	const handleConnectFailure = useCallback(() => {
		if (manualCloseRef.current) {
			return;
		}

		const mode = transportModeRef.current;

		if (mode === "wss") {
			secureFailureCountRef.current += 1;
			const maxWssAttempts = canFallbackToInsecureWebSocket()
				? WSS_ATTEMPTS_BEFORE_WS_FALLBACK
				: WSS_ATTEMPTS_WHEN_NO_FALLBACK;

			if (secureFailureCountRef.current < maxWssAttempts) {
				setTransportStatusHint(
					`Повторное подключение по WSS (${secureFailureCountRef.current}/${maxWssAttempts})...`
				);
				scheduleReconnect();
				return;
			}

			if (canFallbackToInsecureWebSocket()) {
				transportModeRef.current = "ws";
				secureFailureCountRef.current = 0;
				setTransportFallbackActive(true);
				setTransportStatusHint("WSS недоступен. Пробуем подключиться по WS...");
				scheduleReconnect();
				return;
			}

			setStatus("failed");
			setErrorText(
				buildConnectionErrorMessage({
					preferredTransport: preferredTransport,
					fallbackAttempted: false
				})
			);
			return;
		}

		insecureFailureCountRef.current += 1;
		if (insecureFailureCountRef.current < WS_ATTEMPTS_AFTER_FALLBACK) {
			setTransportStatusHint(
				`Подключение по WS (${insecureFailureCountRef.current}/${WS_ATTEMPTS_AFTER_FALLBACK})...`
			);
			scheduleReconnect();
			return;
		}

		setStatus("failed");
		setErrorText(
			buildConnectionErrorMessage({
				preferredTransport: preferredTransport,
				fallbackAttempted: preferredTransport === "wss"
			})
		);
	}, [preferredTransport, scheduleReconnect]);

	const sendSocketPayload = useCallback((payload: Record<string, unknown>) => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}
		socket.send(JSON.stringify(payload));
	}, []);

	const connect = useCallback(() => {
		if (manualCloseRef.current) {
			return;
		}
		setStatus((current) => (current === "reconnecting" ? "reconnecting" : "connecting"));
		setErrorText(null);

		const previousSocket = socketRef.current;
		if (previousSocket) {
			disposeSocket(previousSocket);
			socketRef.current = null;
		}

		const connectUrl = resolveWebSocketUrlForTransport(transportModeRef.current);
		const socket = new WebSocket(connectUrl);
		socketRef.current = socket;

		const isCurrentSocket = () => socketRef.current === socket;

		socket.onopen = () => {
			if (!isCurrentSocket() || manualCloseRef.current) {
				return;
			}
			secureFailureCountRef.current = 0;
			insecureFailureCountRef.current = 0;
			setActiveTransport(transportModeRef.current);
			setActiveWsUrl(connectUrl);
			setTransportFallbackActive(
				transportModeRef.current === "ws" && preferredTransport === "wss"
			);
			setTransportStatusHint(null);
			setErrorText(null);
			setStatus("connecting");
			setHandshakeText(null);
			sendSocketPayload({
				type: "join_room",
				roomId,
				userId,
				protocolVersion: PROTOCOL_VERSION
			});
		};

		socket.onmessage = (event) => {
			if (!isCurrentSocket() || manualCloseRef.current) {
				return;
			}

			const payload = safeParseEvent(event.data);
			if (!payload) {
				return;
			}

			if ("roomId" in payload && payload.roomId !== roomId) {
				return;
			}

			if (payload.protocolVersion !== PROTOCOL_VERSION) {
				setStatus("failed");
				setErrorText("Несовместимая версия протокола. Обновите клиент.");
				manualCloseRef.current = true;
				socket.close();
				return;
			}

			switch (payload.type) {
				case "room_joined":
					setParticipants(payload.participants);
					handshakeSessionIdRef.current = payload.handshakeSessionId;
					resetHandshakeState();
					if (payload.participants >= 2) {
						setStatus("connecting");
						setHandshakeText("Выполняем защищенное рукопожатие...");
						void ensureHandshakeHello(payload.participants);
					} else {
						setStatus("waiting_peer");
						setHandshakeText(null);
					}
					return;
				case "peer_joined":
					setParticipants(payload.participants);
					handshakeSessionIdRef.current = payload.handshakeSessionId;
					resetHandshakeState();
					setStatus("connecting");
					setHandshakeText("Выполняем защищенное рукопожатие...");
					setMessages((prev) => [
						...prev,
						{
							id: `system-join-${payload.userId}-${payload.participants}-${Date.now()}`,
							userId: payload.userId,
							text: "Собеседник подключился к комнате",
							sentAt: new Date().toISOString(),
							isOwn: false,
							kind: "system"
						}
					]);
					void ensureHandshakeHello(payload.participants);
					return;
				case "handshake_peer_hello":
					if (payload.handshakeSessionId !== handshakeSessionIdRef.current) {
						return;
					}
					pendingPeerHelloRef.current = {
						userId: payload.userId,
						publicKey: payload.publicKey,
						proof: payload.proof
					};
					void ensureHandshakeHello(2);
					return;
				case "handshake_peer_finish":
					if (payload.handshakeSessionId !== handshakeSessionIdRef.current) {
						return;
					}
					pendingPeerFinishRef.current = payload.confirmation;
					tryFinalizeHandshake();
					return;
				case "handshake_ready":
					{
						if (payload.handshakeSessionId !== handshakeSessionIdRef.current) {
							return;
						}
						const state = handshakeRef.current;
						if (!state) {
							return;
						}
						state.serverReady = true;
						tryFinalizeHandshake();
					}
					return;
				case "new_message":
					{
						if (payload.userId !== userId) {
							if (peerTypingTimeoutRef.current !== null) {
								window.clearTimeout(peerTypingTimeoutRef.current);
								peerTypingTimeoutRef.current = null;
							}
							setPeerIsTyping(false);
						}

						const key = roomCryptoKeyRef.current;
						if (!key) {
							setStatus("failed");
							setErrorText("Ключ шифрования недоступен.");
							return;
						}

						void decryptMessage({ ciphertext: payload.ciphertext, iv: payload.iv }, key)
							.then((text) => {
								setMessages((prev) => [
									...prev,
									{
										id: payload.messageId,
										userId: payload.userId,
										text,
										sentAt: payload.sentAt,
										isOwn: payload.userId === userId
									}
								]);
							})
							.catch(() => {
								setMessages((prev) => [
									...prev,
									{
										id: `decrypt-failed-${payload.messageId}`,
										userId: payload.userId,
										text: "Не удалось расшифровать сообщение. Убедитесь, что используется исходная ссылка комнаты.",
										sentAt: new Date().toISOString(),
										isOwn: false,
										kind: "system"
									}
								]);
							});
					}
					return;
				case "peer_left":
					setParticipants(payload.participants);
					setStatus("waiting_peer");
					setHandshakeText(null);
					handshakeSessionIdRef.current = null;
					resetHandshakeState();
					if (peerTypingTimeoutRef.current !== null) {
						window.clearTimeout(peerTypingTimeoutRef.current);
						peerTypingTimeoutRef.current = null;
					}
					setPeerIsTyping(false);
					setMessages((prev) => [
						...prev,
						{
							id: `system-left-${payload.userId}-${payload.participants}-${Date.now()}`,
							userId: payload.userId,
							text: "Собеседник покинул комнату",
							sentAt: new Date().toISOString(),
							isOwn: false,
							kind: "system"
						}
					]);
					return;
				case "peer_typing":
					if (payload.userId === userId) {
						return;
					}
					if (peerTypingTimeoutRef.current !== null) {
						window.clearTimeout(peerTypingTimeoutRef.current);
						peerTypingTimeoutRef.current = null;
					}
					setPeerIsTyping(payload.active);
					if (payload.active) {
						peerTypingTimeoutRef.current = window.setTimeout(() => {
							setPeerIsTyping(false);
							peerTypingTimeoutRef.current = null;
						}, PEER_TYPING_TIMEOUT_MS);
					}
					return;
				case "room_full":
					setStatus("room_full");
					setErrorText(payload.message);
					manualCloseRef.current = true;
					socket.close();
					return;
				case "error":
					setErrorText(payload.message);
					if (
						payload.code === "ROOM_MISMATCH" ||
						payload.code === "INTERNAL_ERROR" ||
						payload.code === "HANDSHAKE_REQUIRED" ||
						payload.code === "HANDSHAKE_INVALID"
					) {
						setStatus("failed");
					}
			}
		};

		socket.onclose = () => {
			if (!isCurrentSocket() || manualCloseRef.current) {
				return;
			}
			socketRef.current = null;
			setActiveTransport(null);
			setActiveWsUrl(null);
			handleConnectFailure();
		};

		socket.onerror = () => {
			if (!isCurrentSocket() || manualCloseRef.current) {
				return;
			}
		};
	}, [handleConnectFailure, preferredTransport, roomId, roomKey, sendSocketPayload, userId]);

	connectRef.current = connect;

	const reconnect = useCallback(() => {
		manualCloseRef.current = false;
		handshakeSessionIdRef.current = null;

		if (reconnectTimerRef.current !== null) {
			window.clearTimeout(reconnectTimerRef.current);
			reconnectTimerRef.current = null;
		}

		resetTransportState();

		const socket = socketRef.current;
		if (socket) {
			if (socket.readyState === WebSocket.OPEN) {
				socket.send(
					JSON.stringify({
						type: "leave_room",
						roomId,
						userId,
						protocolVersion: PROTOCOL_VERSION
					})
				);
			}
			disposeSocket(socket);
			socketRef.current = null;
		}

		setErrorText(null);
		resetHandshakeState();
		connect();
	}, [connect, resetTransportState, roomId, userId]);

	useEffect(() => {
		if (!enabled) {
			setStatus("failed");
			setErrorText("Некорректный roomId или отсутствует ключ шифрования.");
			handshakeSessionIdRef.current = null;
			return;
		}
		if (!roomKey) {
			setStatus("failed");
			setErrorText("В ссылке комнаты отсутствует ключ шифрования.");
			handshakeSessionIdRef.current = null;
			return;
		}

		manualCloseRef.current = false;
		resetTransportState();
		connectRef.current();

		return () => {
			manualCloseRef.current = true;
			handshakeSessionIdRef.current = null;
			resetHandshakeState();
			if (typingIdleTimerRef.current !== null) {
				window.clearTimeout(typingIdleTimerRef.current);
				typingIdleTimerRef.current = null;
			}
			if (peerTypingTimeoutRef.current !== null) {
				window.clearTimeout(peerTypingTimeoutRef.current);
				peerTypingTimeoutRef.current = null;
			}
			if (reconnectTimerRef.current !== null) {
				window.clearTimeout(reconnectTimerRef.current);
				reconnectTimerRef.current = null;
			}

			const socket = socketRef.current;
			if (socket) {
				if (socket.readyState === WebSocket.OPEN) {
					if (localTypingActiveRef.current) {
						socket.send(
							JSON.stringify({
								type: "typing_activity",
								roomId,
								userId,
								active: false,
								protocolVersion: PROTOCOL_VERSION
							})
						);
						localTypingActiveRef.current = false;
					}
					socket.send(
						JSON.stringify({
							type: "leave_room",
							roomId,
							userId,
							protocolVersion: PROTOCOL_VERSION
						})
					);
				}
				disposeSocket(socket);
				socketRef.current = null;
			}
		};
	}, [enabled, resetTransportState, roomId, roomKey, userId]);

	const sendTypingActivity = useCallback(
		(active: boolean) => {
			if (localTypingActiveRef.current === active) {
				return;
			}

			localTypingActiveRef.current = active;
			sendSocketPayload({
				type: "typing_activity",
				roomId,
				userId,
				active,
				protocolVersion: PROTOCOL_VERSION
			});
		},
		[roomId, sendSocketPayload, userId]
	);

	const sendMessage = useCallback(
		(text: string) => {
			const trimmed = text.trim();
			if (!trimmed) {
				return;
			}

			if (status !== "connected") {
				return;
			}

			const key = roomCryptoKeyRef.current;
			if (!key) {
				setStatus("failed");
				setErrorText("Ключ шифрования недоступен.");
				return;
			}

			void encryptMessage(trimmed, key)
				.then(({ ciphertext, iv }) => {
					if (typingIdleTimerRef.current !== null) {
						window.clearTimeout(typingIdleTimerRef.current);
						typingIdleTimerRef.current = null;
					}
					sendTypingActivity(false);

					sendSocketPayload({
						type: "chat_message",
						roomId,
						userId,
						messageId: createMessageId(),
						ciphertext,
						iv,
						sentAt: new Date().toISOString(),
						protocolVersion: PROTOCOL_VERSION
					});
				})
				.catch(() => {
					setErrorText("Не удалось зашифровать сообщение.");
				});
		},
		[roomId, sendSocketPayload, sendTypingActivity, status, userId]
	);

	const notifyComposerActivity = useCallback(
		(draft: string) => {
			const canNotify = status === "connected" || status === "waiting_peer";
			if (!canNotify) {
				return;
			}

			const isActive = draft.trim().length > 0;

			if (typingIdleTimerRef.current !== null) {
				window.clearTimeout(typingIdleTimerRef.current);
				typingIdleTimerRef.current = null;
			}

			if (isActive) {
				sendTypingActivity(true);
				typingIdleTimerRef.current = window.setTimeout(() => {
					sendTypingActivity(false);
					typingIdleTimerRef.current = null;
				}, TYPING_IDLE_MS);
				return;
			}

			sendTypingActivity(false);
		},
		[sendTypingActivity, status]
	);

	const statusText = useMemo(() => {
		switch (status) {
			case "connecting":
				return "Подключаемся к комнате...";
			case "waiting_peer":
				return "Вы в комнате. Ожидаем второго участника.";
			case "connected":
				return "Собеседник в комнате. Канал защищен.";
			case "room_full":
				return "Комната уже занята двумя пользователями.";
			case "reconnecting":
				return "Соединение потеряно. Переподключаемся...";
			case "failed":
				return "Не удалось продолжить сессию.";
		}
	}, [status]);

	return {
		status,
		statusText: handshakeText ?? transportStatusHint ?? statusText,
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
	};

	async function ensureHandshakeHello(participantsCount: number): Promise<void> {
		if (!roomKey) {
			return;
		}
		if (participantsCount < 2) {
			return;
		}
		const handshakeSessionId = handshakeSessionIdRef.current;
		if (!handshakeSessionId) {
			return;
		}
		if (handshakeRef.current?.helloSent) {
			try {
				await processPendingPeerHello();
			} catch {
				setStatus("failed");
				setErrorText("Не удалось завершить защищенное рукопожатие.");
				return;
			}
			tryFinalizeHandshake();
			return;
		}

		try {
			const hello = await createHandshakeHello(roomId, roomKey, userId);
			if (manualCloseRef.current) {
				return;
			}
			handshakeRef.current = {
				privateKey: hello.privateKey,
				publicKey: hello.publicKey,
				proof: hello.proof,
				helloSent: true,
				finishSent: false,
				peerFinishVerified: false,
				serverReady: false,
				expectedConfirmation: null
			};
			sendSocketPayload({
				type: "handshake_hello",
				roomId,
				userId,
				handshakeSessionId,
				publicKey: hello.publicKey,
				proof: hello.proof,
				protocolVersion: PROTOCOL_VERSION
			});
			await processPendingPeerHello();
			tryFinalizeHandshake();
		} catch {
			setStatus("failed");
			setErrorText("Не удалось начать защищенное рукопожатие.");
		}
	}

	async function processPendingPeerHello(): Promise<void> {
		const pending = pendingPeerHelloRef.current;
		const handshakeState = handshakeRef.current;
		if (!pending || !handshakeState || handshakeState.expectedConfirmation || !roomKey) {
			return;
		}

		const validProof = await verifyHandshakeHello(
			roomId,
			roomKey,
			pending.userId,
			pending.publicKey,
			pending.proof
		);
		if (!validProof) {
			setStatus("failed");
			setErrorText("Не удалось подтвердить подлинность ключа собеседника.");
			return;
		}

		const session = await createHandshakeSession(
			roomId,
			roomKey,
			userId,
			handshakeState.publicKey,
			handshakeState.privateKey,
			pending.userId,
			pending.publicKey
		);
		roomCryptoKeyRef.current = session.messageKey;
		handshakeState.expectedConfirmation = session.confirmation;
		if (!handshakeState.finishSent) {
			const handshakeSessionId = handshakeSessionIdRef.current;
			if (!handshakeSessionId) {
				return;
			}
			handshakeState.finishSent = true;
			sendSocketPayload({
				type: "handshake_finish",
				roomId,
				userId,
				handshakeSessionId,
				confirmation: session.confirmation,
				protocolVersion: PROTOCOL_VERSION
			});
		}
	}

	function tryFinalizeHandshake(): void {
		const state = handshakeRef.current;
		if (!state || !state.expectedConfirmation) {
			return;
		}

		const pendingPeerFinish = pendingPeerFinishRef.current;
		if (pendingPeerFinish) {
			if (pendingPeerFinish === state.expectedConfirmation) {
				state.peerFinishVerified = true;
				pendingPeerFinishRef.current = null;
			} else {
				setStatus("failed");
				setErrorText("Подтверждение рукопожатия не прошло проверку.");
				return;
			}
		}

		if (state.serverReady && state.finishSent && state.peerFinishVerified && roomCryptoKeyRef.current) {
			setHandshakeText(null);
			setStatus("connected");
		}
	}

	function resetHandshakeState(): void {
		handshakeRef.current = null;
		pendingPeerHelloRef.current = null;
		pendingPeerFinishRef.current = null;
		roomCryptoKeyRef.current = null;
		setHandshakeText(null);
	}
}

function safeParseEvent(raw: unknown): ServerEvent | null {
	if (typeof raw !== "string") {
		return null;
	}

	try {
		const payload = JSON.parse(raw) as ServerEvent;
		if (!payload || typeof payload !== "object" || !("type" in payload)) {
			return null;
		}
		return payload;
	} catch {
		return null;
	}
}

function createMessageId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}
