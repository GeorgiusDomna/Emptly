import { cn } from "@/lib/utils";

type TypingIndicatorProps = {
	className?: string;
};

export function TypingIndicator({ className }: TypingIndicatorProps) {
	return (
		<div
			className={cn("flex items-center gap-2 px-1 text-xs text-muted-foreground", className)}
			role="status"
			aria-live="polite"
		>
			<span>Собеседник печатает</span>
			<span className="inline-flex gap-0.5" aria-hidden>
				<span className="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:0ms]" />
				<span className="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:150ms]" />
				<span className="size-1 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:300ms]" />
			</span>
		</div>
	);
}
