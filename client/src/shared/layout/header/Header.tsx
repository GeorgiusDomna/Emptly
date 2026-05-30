import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { DarkModeSwitcher } from "@/shared/components/dark-mode-switcher/DarkModeSwitcher";
import { RealtimeStatusBadge } from "@/shared/components/realtime-status/RealtimeStatusBadge";

export function NavBar() {
	return (
		<header className="glass-panel site-navbar fixed inset-x-0 top-0 z-50">
			<div className="mx-auto flex h-[var(--app-header-height)] w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
				<Link to="/" className="inline-flex items-center gap-2">
					<div className="rounded-md bg-primary/10 p-2 text-primary">
						<MessageCircle className="size-4" />
					</div>
					<div className="flex flex-col leading-none">
						<span className="text-sm font-semibold">Emptly</span>
						<span className="text-xs text-muted-foreground">2 участника, без истории</span>
					</div>
				</Link>

				<div className="flex items-center gap-1.5 sm:gap-2">
					<RealtimeStatusBadge />
					<DarkModeSwitcher />
				</div>
			</div>
		</header>
	);
}
