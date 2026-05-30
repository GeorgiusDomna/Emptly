export const APP_HEADER_HEIGHT_FALLBACK_PX = 60;
export const ROOM_HEADER_GAP_FALLBACK_PX = 16;

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

export function getAppHeaderHeightPx(): number {
	if (typeof document === "undefined") {
		return APP_HEADER_HEIGHT_FALLBACK_PX;
	}

	const navbar = document.querySelector<HTMLElement>(".site-navbar");
	if (navbar) {
		const height = Math.ceil(navbar.getBoundingClientRect().height);
		if (height > 0) {
			return height;
		}
	}

	const cssHeight = getComputedStyle(document.documentElement)
		.getPropertyValue("--app-header-height")
		.trim();

	if (cssHeight.endsWith("rem")) {
		const rem = Number.parseFloat(cssHeight);
		if (Number.isFinite(rem)) {
			const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
			if (Number.isFinite(rootFontSize)) {
				return Math.ceil(rem * rootFontSize);
			}
		}
	}

	if (cssHeight.endsWith("px")) {
		const px = Number.parseInt(cssHeight, 10);
		if (Number.isFinite(px)) {
			return px;
		}
	}

	return APP_HEADER_HEIGHT_FALLBACK_PX;
}

export function getRoomHeaderGapPx(): number {
	if (typeof document === "undefined") {
		return ROOM_HEADER_GAP_FALLBACK_PX;
	}

	return parseCssLengthToPx(
		getComputedStyle(document.documentElement).getPropertyValue("--room-header-gap"),
		ROOM_HEADER_GAP_FALLBACK_PX
	);
}

export function getRoomHeaderStickyTopPx(): number {
	return getAppHeaderHeightPx() + getRoomHeaderGapPx();
}
