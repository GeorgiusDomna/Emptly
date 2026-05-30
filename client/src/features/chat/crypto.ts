const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const AES_ALGORITHM = "AES-GCM";
const ECDH_ALGORITHM = "ECDH";
const ECDH_CURVE = "P-256";
const IV_LENGTH_BYTES = 12;

export type EncryptedMessage = {
	ciphertext: string;
	iv: string;
};

export type HandshakeHello = {
	privateKey: CryptoKey;
	publicKey: string;
	proof: string;
};

export type HandshakeSession = {
	messageKey: CryptoKey;
	confirmation: string;
};

export async function createHandshakeHello(
	roomId: string,
	roomKey: string,
	userId: string
): Promise<HandshakeHello> {
	const roomKeyBytes = fromBase64Url(roomKey);
	if (roomKeyBytes.byteLength !== 32) {
		throw new Error("invalid room key length");
	}
	const keyPair = await crypto.subtle.generateKey(
		{ name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE },
		false,
		["deriveBits"]
	);
	const exportedPublicKey = await crypto.subtle.exportKey("raw", keyPair.publicKey);
	const publicKey = toBase64Url(new Uint8Array(exportedPublicKey));
	const proofMaterial = textEncoder.encode(`hello|${roomId}|${userId}|${publicKey}`) as Uint8Array<ArrayBuffer>;
	const proof = await hmacBase64Url(roomKeyBytes, proofMaterial);

	return {
		privateKey: keyPair.privateKey,
		publicKey,
		proof
	};
}

export async function verifyHandshakeHello(
	roomId: string,
	roomKey: string,
	userId: string,
	publicKey: string,
	proof: string
): Promise<boolean> {
	const roomKeyBytes = fromBase64Url(roomKey);
	if (roomKeyBytes.byteLength !== 32) {
		return false;
	}
	const proofMaterial = textEncoder.encode(`hello|${roomId}|${userId}|${publicKey}`) as Uint8Array<ArrayBuffer>;
	const expectedProof = await hmacBase64Url(roomKeyBytes, proofMaterial);
	return timingSafeEqual(expectedProof, proof);
}

export async function createHandshakeSession(
	roomId: string,
	roomKey: string,
	localUserId: string,
	localPublicKey: string,
	localPrivateKey: CryptoKey,
	peerUserId: string,
	peerPublicKey: string
): Promise<HandshakeSession> {
	const roomKeyBytes = fromBase64Url(roomKey);
	if (roomKeyBytes.byteLength !== 32) {
		throw new Error("invalid room key length");
	}

	const peerPublicCryptoKey = await crypto.subtle.importKey(
		"raw",
		fromBase64Url(peerPublicKey),
		{ name: ECDH_ALGORITHM, namedCurve: ECDH_CURVE },
		false,
		[]
	);
	const sharedSecretBits = await crypto.subtle.deriveBits(
		{ name: ECDH_ALGORITHM, public: peerPublicCryptoKey },
		localPrivateKey,
		256
	);
	const transcript = buildTranscript(roomId, localUserId, localPublicKey, peerUserId, peerPublicKey);
	const sharedSecretBytes = new Uint8Array(sharedSecretBits) as Uint8Array<ArrayBuffer>;
	const masterSeed = await crypto.subtle.digest(
		"SHA-256",
		concatBytes(sharedSecretBytes, roomKeyBytes, textEncoder.encode(transcript) as Uint8Array<ArrayBuffer>)
	);
	const masterSeedBytes = new Uint8Array(masterSeed) as Uint8Array<ArrayBuffer>;
	const messageKeyDigest = await crypto.subtle.digest(
		"SHA-256",
		concatBytes(masterSeedBytes, textEncoder.encode("message-key") as Uint8Array<ArrayBuffer>)
	);
	const confirmKeyDigest = await crypto.subtle.digest(
		"SHA-256",
		concatBytes(masterSeedBytes, textEncoder.encode("confirm-key") as Uint8Array<ArrayBuffer>)
	);
	const messageKeyBytes = new Uint8Array(messageKeyDigest);
	const confirmKeyBytes = new Uint8Array(confirmKeyDigest);

	const messageKey = await crypto.subtle.importKey("raw", messageKeyBytes, { name: AES_ALGORITHM }, false, [
		"encrypt",
		"decrypt"
	]);
	const confirmation = await hmacBase64Url(
		confirmKeyBytes as Uint8Array<ArrayBuffer>,
		textEncoder.encode(transcript) as Uint8Array<ArrayBuffer>
	);

	return { messageKey, confirmation };
}

export async function encryptMessage(plainText: string, key: CryptoKey): Promise<EncryptedMessage> {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES)) as Uint8Array<ArrayBuffer>;
	const encrypted = await crypto.subtle.encrypt(
		{ name: AES_ALGORITHM, iv },
		key,
		textEncoder.encode(plainText)
	);

	return {
		ciphertext: toBase64Url(new Uint8Array(encrypted)),
		iv: toBase64Url(iv)
	};
}

export async function decryptMessage(payload: EncryptedMessage, key: CryptoKey): Promise<string> {
	const iv = fromBase64Url(payload.iv);
	if (iv.byteLength !== IV_LENGTH_BYTES) {
		throw new Error("invalid iv length");
	}

	const ciphertext = fromBase64Url(payload.ciphertext);
	const decrypted = await crypto.subtle.decrypt({ name: AES_ALGORITHM, iv }, key, ciphertext);
	return textDecoder.decode(decrypted);
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function concatBytes(...parts: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
	const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	for (const part of parts) {
		merged.set(part, offset);
		offset += part.length;
	}
	return merged as Uint8Array<ArrayBuffer>;
}

function buildTranscript(
	roomId: string,
	userIdA: string,
	publicKeyA: string,
	userIdB: string,
	publicKeyB: string
): string {
	const ordered = [
		{ userId: userIdA, publicKey: publicKeyA },
		{ userId: userIdB, publicKey: publicKeyB }
	].sort((left, right) => {
		const byUserId = left.userId.localeCompare(right.userId);
		if (byUserId !== 0) {
			return byUserId;
		}
		return left.publicKey.localeCompare(right.publicKey);
	});
	const first = ordered[0];
	const second = ordered[1];
	return `hs|${roomId}|${first.userId}|${first.publicKey}|${second.userId}|${second.publicKey}`;
}

async function hmacBase64Url(
	keyBytes: Uint8Array<ArrayBuffer>,
	payload: Uint8Array<ArrayBuffer>
): Promise<string> {
	const hmacKey = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, [
		"sign"
	]);
	const signature = await crypto.subtle.sign("HMAC", hmacKey, payload);
	return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string): boolean {
	if (left.length !== right.length) {
		return false;
	}
	let result = 0;
	for (let index = 0; index < left.length; index += 1) {
		result |= left.charCodeAt(index) ^ right.charCodeAt(index);
	}
	return result === 0;
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
	const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
	const base64 = `${normalized}${padding}`;
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes as Uint8Array<ArrayBuffer>;
}
