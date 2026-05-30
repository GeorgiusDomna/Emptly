import { MessageCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/lib/utils";

interface DialogInputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	disabled?: boolean;
}

export const DialogInput: React.FC<DialogInputProps> = ({ value = "", onChange, onSubmit, disabled = false }) => {
	const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
		event?.preventDefault();
		if (!value.trim()) {
			return;
		}
		onSubmit();
		onChange("");
	};

	const canSubmit = !disabled && Boolean(value.trim());

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (canSubmit) {
				handleSubmit();
			}
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="glass-panel relative w-full overflow-hidden rounded-2xl"
		>
			<Textarea
				id="room-message-input"
				rows={2}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				autoComplete="off"
				placeholder="Введите сообщение"
				className={cn(
					"dialog-input-scroll-fade field-sizing-content max-h-48 min-h-[5rem] w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-4 py-3.5 pb-14 pr-[4.25rem] shadow-none sm:px-5 sm:py-4 sm:pb-14 sm:pr-[4.75rem] dark:bg-transparent",
					"focus-visible:border-0 focus-visible:ring-0"
				)}
			/>
			<Button
				type="submit"
				size="icon-sm"
				variant="ghost"
				disabled={!canSubmit}
				className="absolute right-3 bottom-3 z-20 rounded-full bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground sm:right-4 sm:bottom-4"
				aria-label="Отправить сообщение"
			>
				<MessageCircle className="size-4" />
			</Button>
		</form>
	);
};
