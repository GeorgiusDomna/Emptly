import { useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, Lock, PlugZap, RefreshCw, Unlock, XCircle } from "lucide-react";
import { useDraftRoom, useRoomConnection } from "@/features/chat/connection-status-context";
import type { ConnectionStatus } from "@/features/chat/types";
import { useServerHealth } from "@/features/chat/useServerHealth";
import { PROTOCOL_VERSION } from "@/lib/server";
import { getPreferredWebSocketTransport, getTransportPresentation } from "@/lib/transport";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

type StatusDotTone = "success" | "pending" | "danger";

function isActiveRoomSession(status: ConnectionStatus): boolean {
	return (
		status === "connected" ||
		status === "waiting_peer" ||
		status === "connecting" ||
		status === "reconnecting"
	);
}

function getServerDotPresentation(state: "checking" | "online" | "offline"): {
	tone: StatusDotTone;
	pulse: boolean;
} {
	switch (state) {
		case "online":
			return { tone: "success", pulse: false };
		case "offline":
			return { tone: "danger", pulse: false };
		default:
			return { tone: "pending", pulse: true };
	}
}

function dotToneClasses(tone: StatusDotTone): string {
	switch (tone) {
		case "success":
			return "bg-emerald-500";
		case "pending":
			return "bg-amber-500";
		case "danger":
			return "bg-red-500";
	}
}

function formatCheckedAt(date: Date | null): string {
	if (!date) {
		return "—";
	}

	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function canReconnectRoom(status: ConnectionStatus): boolean {
	return status === "failed" || status === "reconnecting" || status === "connecting";
}

function getConnectionStatusLabel(status: ConnectionStatus): string {
	switch (status) {
		case "connected":
			return "Подключено";
		case "waiting_peer":
			return "Ожидание собеседника";
		case "connecting":
			return "Подключение";
		case "reconnecting":
			return "Переподключение";
		case "room_full":
			return "Комната занята";
		case "failed":
			return "Ошибка";
	}
}

type SessionStepState = "done" | "loading" | "pending" | "error";

type SessionStep = {
	label: string;
	state: SessionStepState;
};

const SESSION_STEP_SECURE_CHANNEL = "Защищённое соединение";
const SESSION_STEP_ACTIVE_DIALOG = "Диалог активен";

function getSessionSteps(status: ConnectionStatus, participants: number): SessionStep[] {
	const roomConnected: SessionStep = { label: "Подключение к комнате", state: "done" };
	const waitingPeer: SessionStep = { label: "Ожидание собеседника", state: "done" };
	const secureChannelDone: SessionStep = { label: SESSION_STEP_SECURE_CHANNEL, state: "done" };
	const secureChannelLoading: SessionStep = { label: SESSION_STEP_SECURE_CHANNEL, state: "loading" };
	const secureChannelPending: SessionStep = { label: SESSION_STEP_SECURE_CHANNEL, state: "pending" };
	const dialogDone: SessionStep = { label: SESSION_STEP_ACTIVE_DIALOG, state: "done" };
	const dialogPending: SessionStep = { label: SESSION_STEP_ACTIVE_DIALOG, state: "pending" };

	switch (status) {
		case "connected":
			return [roomConnected, waitingPeer, secureChannelDone, dialogDone];
		case "waiting_peer":
			return [
				roomConnected,
				{ label: "Ожидание собеседника", state: "loading" },
				secureChannelPending,
				dialogPending
			];
		case "connecting":
		case "reconnecting": {
			if (participants >= 2) {
				return [
					{
						label: "Подключение к комнате",
						state: status === "reconnecting" ? "loading" : "done"
					},
					waitingPeer,
					secureChannelLoading,
					dialogPending
				];
			}

			return [
				{ label: "Подключение к комнате", state: "loading" },
				{ label: "Ожидание собеседника", state: "pending" },
				secureChannelPending,
				dialogPending
			];
		}
		case "room_full":
		case "failed":
			return [
				{ label: "Подключение к комнате", state: "error" },
				{ label: "Ожидание собеседника", state: "pending" },
				secureChannelPending,
				dialogPending
			];
	}
}

function getStatusHeadline(
	effectiveState: "checking" | "online" | "offline",
	state: "checking" | "online" | "offline",
	hasActiveWsSession: boolean
): string {
	if (effectiveState === "online") {
		return state === "offline" && hasActiveWsSession
			? "Ресурс доступен. Активное WebSocket-соединение подтверждает работу сервера."
			: "Ресурс доступен";
	}

	if (effectiveState === "offline") {
		return "Ресурс недоступен. Проверьте, что backend запущен.";
	}

	return "Проверяем доступность ресурса...";
}

function getDraftSessionSteps(): SessionStep[] {
	return [
		{ label: "Комната создана", state: "done" },
		{ label: "Подключение к комнате", state: "pending" },
		{ label: "Ожидание собеседника", state: "pending" },
		{ label: SESSION_STEP_SECURE_CHANNEL, state: "pending" },
		{ label: SESSION_STEP_ACTIVE_DIALOG, state: "pending" }
	];
}

function SessionStepIcon({ state }: { state: SessionStepState }) {
	switch (state) {
		case "done":
			return <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden />;
		case "loading":
			return <Loader2 className="size-3.5 animate-spin text-amber-500" aria-hidden />;
		case "error":
			return <XCircle className="size-3.5 text-destructive" aria-hidden />;
		case "pending":
			return <CircleDashed className="size-3.5 text-muted-foreground" aria-hidden />;
	}
}

export function RealtimeStatusBadge() {
	const roomConnection = useRoomConnection();
	const draftRoom = useDraftRoom();
	const { state, lastCheckedAt, check, activeHealthTransport, healthFallbackActive } = useServerHealth();
	const [refreshAnimKey, setRefreshAnimKey] = useState(0);
	const hasActiveWsSession = Boolean(roomConnection && isActiveRoomSession(roomConnection.status));
	const effectiveState =
		state === "offline" && hasActiveWsSession ? "online" : state;
	const dot = getServerDotPresentation(effectiveState);

	const transport = roomConnection?.activeTransport
		? getTransportPresentation(roomConnection.activeTransport, {
				fallbackActive: roomConnection.transportFallbackActive,
				preferred: roomConnection.preferredTransport
			})
		: activeHealthTransport
			? getTransportPresentation(activeHealthTransport === "https" ? "wss" : "ws", {
					fallbackActive: healthFallbackActive,
					preferred: getPreferredWebSocketTransport()
				})
			: getTransportPresentation(getPreferredWebSocketTransport());

	const handleRefreshStatus = () => {
		setRefreshAnimKey((key) => key + 1);
		void check();
	};

	const statusHeadline = getStatusHeadline(effectiveState, state, hasActiveWsSession);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="hidden cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground sm:inline-flex"
					aria-label="Статус realtime-сервера"
				>
					<PlugZap className="size-3.5" />
					Realtime
					<span
						aria-hidden
						className={cn("size-1.5 rounded-full", dotToneClasses(dot.tone), dot.pulse && "animate-pulse")}
					/>
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="space-y-3">
				<div className="space-y-1">
					<p className="animate-status-headline-text text-sm font-medium">{statusHeadline}</p>
				</div>

				<dl className="space-y-2 text-xs text-muted-foreground">
					<div className="flex items-center justify-between gap-3">
						<dt>Транспорт</dt>
						<dd className="inline-flex items-center gap-1.5 text-foreground">
							{transport.secured ? (
								<Lock className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
							) : (
								<Unlock className="size-3 text-amber-600 dark:text-amber-400" aria-hidden />
							)}
							<span>{transport.label}</span>
							<span className="text-muted-foreground">· {transport.hint}</span>
						</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt>Протокол чата</dt>
						<dd className="text-foreground">{PROTOCOL_VERSION}</dd>
					</div>
					<div className="flex items-center justify-between gap-3">
						<dt>Проверено</dt>
						<dd className="text-foreground">{formatCheckedAt(lastCheckedAt)}</dd>
					</div>
				</dl>

				{roomConnection ? (
					<div className="space-y-2 rounded-md border px-2.5 py-2">
						<p className="text-xs font-medium text-foreground">Текущая сессия</p>
						<p className="text-xs text-muted-foreground">
							{getConnectionStatusLabel(roomConnection.status)} · {roomConnection.statusText}
						</p>
						{roomConnection.transportFallbackActive ? (
							<p className="text-xs text-amber-600 dark:text-amber-400">
								WSS недоступен, сессия работает через WS без TLS на транспорте.
							</p>
						) : null}
						<ul className="space-y-1.5">
							{getSessionSteps(roomConnection.status, roomConnection.participants).map((step) => (
								<li key={step.label} className="flex items-center gap-2 text-xs text-muted-foreground">
									<SessionStepIcon state={step.state} />
									<span>{step.label}</span>
								</li>
							))}
						</ul>
						{roomConnection.errorText ? (
							<p className="text-xs text-destructive">{roomConnection.errorText}</p>
						) : null}
					</div>
				) : draftRoom ? (
					<div className="space-y-2 rounded-md border px-2.5 py-2">
						<p className="text-xs font-medium text-foreground">Текущая сессия</p>
						<p className="text-xs text-muted-foreground">Комната создана · {draftRoom.statusText}</p>
						<ul className="space-y-1.5">
							{getDraftSessionSteps().map((step) => (
								<li key={step.label} className="flex items-center gap-2 text-xs text-muted-foreground">
									<SessionStepIcon state={step.state} />
									<span>{step.label}</span>
								</li>
							))}
						</ul>
					</div>
				) : (
					<p className="text-xs text-muted-foreground">Нет активной сессии</p>
				)}

				{roomConnection && canReconnectRoom(roomConnection.status) ? (
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="w-full"
						onClick={roomConnection.reconnect}
					>
						<RefreshCw className="size-3.5" />
						Переподключиться
					</Button>
				) : null}

				<Button type="button" variant="outline" size="sm" className="w-full" onClick={handleRefreshStatus}>
					<RefreshCw
						key={refreshAnimKey > 0 ? refreshAnimKey : "idle"}
						className={cn("size-3.5 origin-center", refreshAnimKey > 0 && "animate-refresh-spring")}
					/>
					Обновить статус
				</Button>
			</PopoverContent>
		</Popover>
	);
}
