import path from "node:path";
import { defineConfig } from "@playwright/test";

const repoRoot = path.resolve(__dirname, "..");
const clientDir = __dirname;
const serverDir = path.resolve(repoRoot, "server");

export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 60_000,
	expect: {
		timeout: 10_000
	},
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry"
	},
	webServer: [
		{
			command: "npm run dev",
			cwd: serverDir,
			url: "http://127.0.0.1:5001/health",
			reuseExistingServer: !process.env.CI,
			timeout: 60_000
		},
		{
			command: "npm run dev -- --env mode=development --env port=3000 --no-open",
			cwd: clientDir,
			url: "http://127.0.0.1:3000",
			reuseExistingServer: !process.env.CI,
			timeout: 60_000
		}
	]
});
