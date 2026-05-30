import type { ChatViewMessage } from "@/shared/components/message-list/types";
import { cn } from "@/lib/utils";

type MessageItemProps = {
	message: ChatViewMessage;
	prevMessage: ChatViewMessage | null;
	nextMessage: ChatViewMessage | null;
};

export const MessageItem = ({ message, prevMessage, nextMessage }: MessageItemProps) => {
	const { text, sentAt, isOwn, kind = "user", userId } = message;
	const time = new Date(sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	const isGroupContinuation = Boolean(
		kind === "user" && prevMessage && prevMessage.kind !== "system" && prevMessage.userId === userId
	);
	const showTail = Boolean(
		kind === "user" &&
			(!nextMessage || nextMessage.kind === "system" || nextMessage.userId !== userId)
	);

	return (
		<div className={cn("w-full px-1.5", isGroupContinuation ? "pt-1" : "pt-3")}>
			{kind === "system" ? (
				<div className="mx-auto w-fit rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
					{text}
				</div>
			) : (
				<div
					className={cn(
						"relative w-fit max-w-[85%] rounded-2xl px-2.5 py-1.5 text-foreground sm:max-w-[70%]",
						isOwn
							? "ml-auto mr-1 bg-[var(--chat-bubble-own)]"
							: "mr-auto ml-1 bg-[var(--chat-bubble-peer)]",
						showTail && isOwn && "rounded-br-md rounded-br-none",
						showTail && !isOwn && "rounded-bl-md rounded-bl-none"
					)}
				>
					{showTail ? (
						<span
							aria-hidden
							className={cn(
								"absolute bottom-0 h-3 w-2.5",
								isOwn
									? "-right-2 bg-[var(--chat-bubble-own)] [clip-path:polygon(0_0,0_100%,100%_100%)]"
									: "-left-2 bg-[var(--chat-bubble-peer)] [clip-path:polygon(100%_0,100%_100%,0_100%)]"
							)}
						/>
					) : null}
					<div className="relative flex flex-col gap-0.5">
						<p className="break-words text-[14px] leading-snug">{text}</p>
						<span className="self-end text-[10px] text-muted-foreground">{time}</span>
					</div>
				</div>
			)}
		</div>
	);
};
