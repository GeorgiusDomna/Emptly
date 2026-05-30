import { Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ConnectionStatusProvider } from "@/features/chat/connection-status-context";
import { NavBar } from "@/shared/layout/header/Header";
import { Toaster } from "@/shared/ui/sonner";
import "./globals.css";

const App = () => {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="theme">
			<ConnectionStatusProvider>
				<div className="flex min-h-dvh flex-col bg-background text-foreground">
					<NavBar />
					<div aria-hidden className="h-[var(--app-header-height)] shrink-0" />
					<main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-6 pt-4 sm:px-6 sm:pt-6">
						<Outlet />
					</main>
				</div>
				<Toaster richColors closeButton position="top-center" offset={{ top: 68 }} />
			</ConnectionStatusProvider>
		</ThemeProvider>
	);
};

export default App;