import { Link } from "react-router-dom";
import { Link2, PlusCircle } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from "@/shared/ui/empty";

const HomePage = () => {
	return (
		<section className="flex w-full flex-1 items-center justify-center py-6 sm:py-10">
			<Empty className="w-full max-w-xl border bg-card text-card-foreground">
				<EmptyHeader className="max-w-lg gap-3">
					<EmptyMedia variant="icon" className="size-12 rounded-xl bg-primary/10 text-primary">
						<Link2 className="size-6" />
					</EmptyMedia>
					<EmptyTitle className="text-xl sm:text-2xl">Приватная комната для двоих</EmptyTitle>
					<EmptyDescription className="text-sm sm:text-base">
						Создайте новую комнату или подключитесь по ссылке. История диалога нигде не сохраняется.
					</EmptyDescription>
				</EmptyHeader>

				<EmptyContent className="w-full max-w-md gap-2">
					<Button asChild className="h-12 w-full">
						<Link to="/create-room/">
							<PlusCircle className="size-4" />
							Создать комнату
						</Link>
					</Button>
					<Button asChild variant="secondary" className="h-12 w-full">
						<Link to="/connect-room/">
							<Link2 className="size-4" />
							Подключиться
						</Link>
					</Button>
				</EmptyContent>
			</Empty>
		</section>
	);
};

export default HomePage;
