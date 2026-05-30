import { useCallback, useLayoutEffect, useRef } from "react";
import { MessageItem } from "@/shared/components/message-item/MessageItem";
import type { ChatViewMessage } from "@/shared/components/message-list/types";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageListProps {
	list: ChatViewMessage[];
	className?: string;
	scrollRevision?: number;
}

export const MessageList: React.FC<MessageListProps> = ({ list, className, scrollRevision = 0 }) => {
	const bottomRef = useRef<HTMLDivElement>(null);
	const lastMessage = list[list.length - 1];
	const lastMessageId = lastMessage?.id;
	const shouldAutoScroll = lastMessage?.isOwn === true;

	const scrollToLatest = useCallback(() => {
		bottomRef.current?.scrollIntoView({ block: "end", behavior: "instant" });
	}, []);

	useLayoutEffect(() => {
		if (!list.length || !shouldAutoScroll) {
			return;
		}

		scrollToLatest();
		const rafId = requestAnimationFrame(scrollToLatest);

		return () => {
			cancelAnimationFrame(rafId);
		};
	}, [list.length, lastMessageId, shouldAutoScroll, scrollRevision, scrollToLatest]);

	if (!list.length) {
		return (
			<div className={cn("flex min-h-[40vh] items-center justify-center py-12", className)}>
				<div className="flex max-w-sm flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
					<MessagesSquare className="size-5" />
					<p>Сообщений пока нет. Напишите первым, чтобы начать диалог.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col", className)}>
			{list.map((message, index) => (
				<MessageItem
					key={message.id}
					message={message}
					prevMessage={index > 0 ? list[index - 1] : null}
					nextMessage={index < list.length - 1 ? list[index + 1] : null}
				/>
			))}
			<div ref={bottomRef} className="chat-scroll-anchor h-px shrink-0" aria-hidden />
		</div>
	);
};
