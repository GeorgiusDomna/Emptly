export const CHAT_COMPOSER_GAP_FALLBACK_PX = 4;
export const CHAT_COMPOSER_OFFSET_FALLBACK_PX = 208;

function parseCssLengthToPx(value: string, fallbackPx: number): number {
	const trimmed = value.trim();
	if (!trimmed) {
		return fallbackPx;
	}

	if (trimmed.endsWith("rem")) {
		const rem = Number.parseFloat(trimmed);
		if (Number.isFinite(rem) && typeof document !== "undefined") {
			const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
			if (Number.isFinite(rootFontSize)) {
				return Math.ceil(rem * rootFontSize);
			}
		}
	}

	if (trimmed.endsWith("px")) {
		const px = Number.parseFloat(trimmed);
		if (Number.isFinite(px)) {
			return Math.ceil(px);
		}
	}

	return fallbackPx;
}

export function getChatComposerGapPx(): number {
	if (typeof document === "undefined") {
		return CHAT_COMPOSER_GAP_FALLBACK_PX;
	}

	return parseCssLengthToPx(
		getComputedStyle(document.documentElement).getPropertyValue("--chat-composer-gap"),
		CHAT_COMPOSER_GAP_FALLBACK_PX
	);
}

export function setChatComposerOffsetPx(dockHeightPx: number): void {
	if (typeof document === "undefined") {
		return;
	}

	const offsetPx = Math.ceil(dockHeightPx) + getChatComposerGapPx();
	document.documentElement.style.setProperty("--chat-composer-offset", `${offsetPx}px`);
}
