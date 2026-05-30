import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ConnectionStatus } from "@/features/chat/types";
import { getRoomHeaderStickyTopPx } from "@/lib/app-header";
import { cn } from "@/lib/utils";

type RoomHeaderProps = {
	roomId: string | null;
	status: ConnectionStatus;
	statusText: string;
	errorText: string | null;
	participants: number;
	onCopyRoomLink: () => void;
};

const glassPanelClass = "glass-panel rounded-2xl";

export const RoomHeader = ({
	roomId,
	status,
	statusText,
	errorText,
	participants,
	onCopyRoomLink
}: RoomHeaderProps) => {
	const headerRef = useRef<HTMLElement>(null);
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);
	const [isCompact, setIsCompact] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const isConnected = status === "connected";

	useEffect(() => {
		if (!isCompact) {
			setIsExpanded(false);
		}
	}, [isCompact]);

	useLayoutEffect(() => {
		const header = headerRef.current;
		if (!header) {
			return;
		}

		const updateHeight = () => {
			setHeaderHeight(header.offsetHeight);
		};

		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		observer.observe(header);

		return () => {
			observer.disconnect();
		};
	}, [isCompact, statusText, errorText, participants, roomId, isExpanded]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel || typeof IntersectionObserver === "undefined") {
			return;
		}

		const createObserver = () => {
			const stickyTopPx = getRoomHeaderStickyTopPx();
			const offsetPx = stickyTopPx + headerHeight;

			return new IntersectionObserver(
				([entry]) => {
					setIsCompact((prev) => {
						const next = !entry.isIntersecting;
						return prev === next ? prev : next;
					});
				},
				{
					root: null,
					rootMargin: `-${offsetPx}px 0px 0px 0px`,
					threshold: 0
				}
			);
		};

		const observer = createObserver();
		observer.observe(sentinel);

		return () => {
			observer.disconnect();
		};
	}, [headerHeight]);

	return (
		<>
			<div aria-hidden className="shrink-0" style={{ height: headerHeight > 0 ? headerHeight : undefined }} />

			<header
				ref={headerRef}
				className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 sm:px-6"
				style={{ top: "var(--room-header-sticky-top)" }}
			>
				<div
					className={cn(
						"pointer-events-auto w-full max-w-4xl transition-[box-shadow,background-color,padding]",
						isCompact
							? cn(glassPanelClass, "px-4 py-2.5 sm:px-5")
							: "rounded-xl border bg-card p-4 sm:p-5"
					)}
				>
					{isCompact && !isExpanded ? (
						<button
							type="button"
							className="flex w-full items-center gap-3 text-left"
							aria-expanded={false}
							aria-label="Развернуть информацию о комнате"
							onClick={() => setIsExpanded(true)}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold">{roomId ?? "некорректный roomId"}</p>
								<p
									className={cn(
										"truncate text-xs",
										isConnected
											? "text-emerald-600 dark:text-emerald-400"
											: "text-muted-foreground"
									)}
								>
									{statusText}
								</p>
							</div>
							<span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-foreground/5 px-2 py-0.5 text-xs text-muted-foreground">
								<MessageCircle className="size-3" />
								{participants}/2
							</span>
							<ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
						</button>
					) : (
						<RoomHeaderContent
							roomId={roomId}
							statusText={statusText}
							errorText={errorText}
							participants={participants}
							isConnected={isConnected}
							onCopyRoomLink={onCopyRoomLink}
						/>
					)}
				</div>
			</header>

			<div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden />

			{isCompact && isExpanded ? (
				<>
					<button
						type="button"
						className="fixed inset-0 z-30 bg-background/30 backdrop-blur-[2px]"
						aria-label="Свернуть информацию о комнате"
						onClick={() => setIsExpanded(false)}
					/>
					<div
						className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 sm:px-6"
						style={{ top: "var(--room-header-sticky-top)" }}
					>
						<div className={cn(glassPanelClass, "pointer-events-auto w-full max-w-4xl p-4 sm:p-5")}>
							<RoomHeaderContent
								roomId={roomId}
								statusText={statusText}
								errorText={errorText}
								participants={participants}
								isConnected={isConnected}
								onCopyRoomLink={onCopyRoomLink}
							/>
							<div className="mt-3 flex justify-end border-t border-foreground/10 pt-3">
								<Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
									<ChevronDown className="size-4 rotate-180" />
									Свернуть
								</Button>
							</div>
						</div>
					</div>
				</>
			) : null}
		</>
	);
};

type RoomHeaderContentProps = {
	roomId: string | null;
	statusText: string;
	errorText: string | null;
	participants: number;
	isConnected: boolean;
	onCopyRoomLink: () => void;
};

const RoomHeaderContent = ({
	roomId,
	statusText,
	errorText,
	participants,
	isConnected,
	onCopyRoomLink
}: RoomHeaderContentProps) => {
	return (
		<>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<p className="text-sm text-muted-foreground">Комната</p>
					<h1 className="text-base font-semibold sm:text-lg">{roomId ?? "некорректный roomId"}</h1>
				</div>
				<div className="inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
					<MessageCircle className="size-3.5" />
					{participants}/2 участника
				</div>
			</div>
			<p
				className={cn(
					"mt-3 text-sm",
					isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
				)}
			>
				{statusText}
			</p>
			{errorText ? <p className="mt-1 text-sm text-destructive">{errorText}</p> : null}
			<div className="mt-3 flex flex-col gap-2 sm:flex-row">
				<Button type="button" variant="outline" size="sm" onClick={onCopyRoomLink} className="sm:w-auto">
					<Copy className="size-4" />
					Копировать ссылку комнаты
				</Button>
				<Button asChild variant="ghost" size="sm" className="sm:w-auto">
					<Link to="/create-room/">Выйти из комнаты</Link>
				</Button>
			</div>
		</>
	);
};
