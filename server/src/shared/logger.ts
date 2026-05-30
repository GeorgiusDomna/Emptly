type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40
};

export function createLogger(level: LogLevel) {
	const minLevelOrder = levelOrder[level];

	return {
		debug: (message: string, fields?: Record<string, unknown>) => write("debug", message, fields),
		info: (message: string, fields?: Record<string, unknown>) => write("info", message, fields),
		warn: (message: string, fields?: Record<string, unknown>) => write("warn", message, fields),
		error: (message: string, fields?: Record<string, unknown>) => write("error", message, fields)
	};

	function write(currentLevel: LogLevel, message: string, fields?: Record<string, unknown>): void {
		if (levelOrder[currentLevel] < minLevelOrder) {
			return;
		}

		const payload = {
			timestamp: new Date().toISOString(),
			level: currentLevel,
			message,
			...fields
		};
		console.log(JSON.stringify(payload));
	}
}
