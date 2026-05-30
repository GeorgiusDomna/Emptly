import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2 } from "lucide-react";
import { toast } from "sonner";
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
import { Field, FieldDescription, FieldError } from "@/shared/ui/field";
import { parseRoomTarget } from "@/lib/room";

const ConnectRoom = () => {
	const navigate = useNavigate();
	const [value, setValue] = useState("");
	const [errorText, setErrorText] = useState<string | null>(null);

	const handleConnect = () => {
		const roomTarget = parseRoomTarget(value);
		if (!roomTarget) {
			setErrorText("Введите корректную ссылку или roomId.");
			toast.error("Неверная ссылка комнаты");
			return;
		}
		setErrorText(null);
		navigate({
			pathname: `/room/${roomTarget.roomId}/`,
			hash: roomTarget.roomKey ? `k=${roomTarget.roomKey}` : ""
		});
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		handleConnect();
	};

	return (
		<section className="flex w-full items-center justify-center py-6 sm:py-10">
			<Empty className="w-full max-w-xl border bg-card text-card-foreground">
				<EmptyHeader className="max-w-lg">
					<EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary">
						<Link2 className="size-6" />
					</EmptyMedia>
					<EmptyTitle className="text-xl sm:text-2xl">Подключение к комнате</EmptyTitle>
					<EmptyDescription>
						Для защищенного чата вставьте полную ссылку комнаты. Комната принимает максимум двух участников.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent className="w-full max-w-lg">
					<form onSubmit={handleSubmit} className="w-full space-y-3">
						<Field className="w-full gap-2">
							<Input
								value={value}
								onChange={(event) => setValue(event.target.value)}
								placeholder="https://.../room/<roomId>/ или roomId"
								className="h-11"
								autoComplete="off"
							/>
							<FieldDescription>Если вставить только roomId, без ключа шифрования войти не получится.</FieldDescription>
							<FieldError>{errorText}</FieldError>
						</Field>
						<Button type="submit" disabled={!value.trim()} className="w-full">
							Войти в комнату
						</Button>
					</form>
					<Button asChild variant="ghost" className="w-full">
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

export default ConnectRoom;