import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Link2, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { useConnectionStatusContext } from "@/features/chat/connection-status-context";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "@/shared/ui/empty";
import {
	buildRoomInviteLink,
	generateRoomId,
	generateRoomKey,
	getOrCreateDraftRoomKey,
	getOrCreateDraftRoomId,
	setDraftRoomKey,
	setDraftRoomId
} from "@/lib/room";
import { cn } from "@/lib/utils";

const StartPage = () => {
	const navigate = useNavigate();
	const { setDraftRoom } = useConnectionStatusContext();
	const [roomId, setRoomId] = useState(() => getOrCreateDraftRoomId());
	const [roomKey, setRoomKey] = useState(() => getOrCreateDraftRoomKey());
	const [copied, setCopied] = useState(false);
	const [refreshAnimKey, setRefreshAnimKey] = useState(0);
	const [linkFlashKey, setLinkFlashKey] = useState(0);
	const roomLink = useMemo(() => buildRoomInviteLink(roomId, roomKey), [roomId, roomKey]);

	useEffect(() => {
		setDraftRoom({
			roomId,
			statusText: "Комната создана. Войдите или отправьте ссылку собеседнику."
		});

		return () => {
			setDraftRoom(null);
		};
	}, [roomId, setDraftRoom]);

	const handleCreateRoom = () => {
		setDraftRoomId(roomId);
		setDraftRoomKey(roomKey);
		navigate({
			pathname: `/room/${roomId}/`,
			hash: `k=${roomKey}`
		});
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(roomLink);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
			toast.success("Ссылка скопирована", {
				description: "Отправьте её второму участнику для входа в комнату."
			});
		} catch {
			toast.error("Не удалось скопировать ссылку", {
				description: "Скопируйте ссылку вручную из поля выше."
			});
		}
	};

	const handleRegenerateRoom = () => {
		setCopied(false);
		setRefreshAnimKey((key) => key + 1);
		setLinkFlashKey((key) => key + 1);
		const nextRoomId = generateRoomId();
		const nextRoomKey = generateRoomKey();
		setDraftRoomId(nextRoomId);
		setDraftRoomKey(nextRoomKey);
		setRoomId(nextRoomId);
		setRoomKey(nextRoomKey);
		toast.info("Создана новая комната", {
			description: "Старая ссылка больше не будет работать."
		});
	};

	return (
		<section className="flex w-full items-center justify-center py-6 sm:py-10">
			<Empty className="w-full max-w-2xl border bg-card text-card-foreground">
				<EmptyHeader className="max-w-xl gap-3">
					<EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary">
						<Link2 className="size-6" />
					</EmptyMedia>
					<EmptyTitle className="text-xl sm:text-2xl">Комната создана</EmptyTitle>
					<EmptyDescription className="text-sm sm:text-base">
						Комната предназначена только для двух участников. Сообщения шифруются на клиентах и не сохраняются на сервере.
					</EmptyDescription>
				</EmptyHeader>

				<EmptyContent className="w-full max-w-xl gap-3">
					<div className="w-full rounded-lg border bg-muted/40 p-3 sm:p-4">
						<p className="mb-2 text-left text-xs text-muted-foreground">Ссылка для приглашения</p>
						<div className="relative overflow-hidden rounded-md">
							<Input value={roomLink} readOnly className="bg-background" />
							{linkFlashKey > 0 ? (
								<div key={linkFlashKey} aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-md">
									<div className="animate-link-sweep absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />
								</div>
							) : null}
						</div>
					</div>
					<div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
						<Button type="button" variant="outline" onClick={handleCopy} className="w-full">
							<Copy className="size-4" />
							{copied ? "Скопировано" : "Копировать ссылку"}
						</Button>
						<Button type="button" variant="outline" onClick={handleRegenerateRoom} className="w-full">
							<RefreshCcw
								key={refreshAnimKey > 0 ? refreshAnimKey : "idle"}
								className={cn("size-4 origin-center", refreshAnimKey > 0 && "animate-refresh-spring")}
							/>
							Новый roomId
						</Button>
					</div>
				</EmptyContent>

				<EmptyContent className="w-full max-w-xl gap-2">
					<Button type="button" onClick={handleCreateRoom} className="w-full max-w-xl">
						Войти в комнату
					</Button>
					<Button asChild variant="ghost" className="w-full max-w-xl">
						<Link to="/">
							<ArrowLeft className="size-4" />
							На главную
						</Link>
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
};

export default StartPage;