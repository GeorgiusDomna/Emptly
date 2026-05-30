import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const certsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../certs");
const certPath = path.join(certsDir, "dev-cert.pem");
const keyPath = path.join(certsDir, "dev-key.pem");

fs.mkdirSync(certsDir, { recursive: true });

execSync(
	`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=localhost"`,
	{ stdio: "inherit" }
);

console.log(`Dev TLS certificate written to:\n  ${certPath}\n  ${keyPath}`);
