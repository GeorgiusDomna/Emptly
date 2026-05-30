import fs from "node:fs";
import type { SecureContextOptions } from "node:tls";

export type TlsFilePaths = {
	certPath: string;
	keyPath: string;
	caPath?: string;
};

export function resolveTlsFilePaths(env: NodeJS.ProcessEnv): TlsFilePaths | null {
	const certPath = env.TLS_CERT_PATH?.trim();
	const keyPath = env.TLS_KEY_PATH?.trim();
	if (!certPath || !keyPath) {
		return null;
	}

	const caPath = env.TLS_CA_PATH?.trim() || undefined;
	return { certPath, keyPath, caPath };
}

export function loadTlsOptions(paths: TlsFilePaths): SecureContextOptions {
	const cert = readRequiredFile(paths.certPath, "TLS_CERT_PATH");
	const key = readRequiredFile(paths.keyPath, "TLS_KEY_PATH");
	const options: SecureContextOptions = { cert, key };

	if (paths.caPath) {
		options.ca = readRequiredFile(paths.caPath, "TLS_CA_PATH");
	}

	return options;
}

function readRequiredFile(filePath: string, envName: string): Buffer {
	if (!fs.existsSync(filePath)) {
		throw new Error(`${envName} points to a missing file: ${filePath}`);
	}

	return fs.readFileSync(filePath);
}
