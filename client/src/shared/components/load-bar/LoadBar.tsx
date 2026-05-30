import { Spinner } from "@/shared/ui/spinner";

export function LoadBar() {
	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
			<Spinner className="size-6" />
			<span className="text-sm text-muted-foreground">Загрузка...</span>
		</div>
	);
}
