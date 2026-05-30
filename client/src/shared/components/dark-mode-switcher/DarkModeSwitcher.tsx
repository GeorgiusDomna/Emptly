import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/lib/utils";

type ThemeChoice = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{
	value: ThemeChoice;
	label: string;
	Icon: typeof Sun;
}> = [
	{ value: "light", label: "Светлая", Icon: Sun },
	{ value: "dark", label: "Тёмная", Icon: Moon },
	{ value: "system", label: "Как в системе", Icon: Monitor }
];

export const DarkModeSwitcher = () => {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const activeTheme: ThemeChoice =
		theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

	const ActiveIcon = THEME_OPTIONS.find((option) => option.value === activeTheme)?.Icon ?? Monitor;

	const handleSelect = (value: ThemeChoice) => {
		setTheme(value);
		setOpen(false);
	};

	if (!mounted) {
		return <Button type="button" variant="outline" size="icon" className="h-9 w-9" disabled />;
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="h-9 w-9"
					aria-label="Тема оформления"
				>
					<ActiveIcon className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-44 p-1">
				<ul className="space-y-0.5" role="listbox" aria-label="Выбор темы">
					{THEME_OPTIONS.map(({ value, label, Icon }) => {
						const isActive = activeTheme === value;

						return (
							<li key={value} role="option" aria-selected={isActive}>
								<Button
									type="button"
									variant="ghost"
									className={cn(
										"h-9 w-full justify-start gap-2 px-2 font-normal",
										isActive && "bg-accent text-accent-foreground"
									)}
									onClick={() => handleSelect(value)}
								>
									<Icon className="size-4 shrink-0" />
									<span className="flex-1 text-left text-sm">{label}</span>
									{isActive ? <Check className="size-4 shrink-0 opacity-80" /> : null}
								</Button>
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
};
