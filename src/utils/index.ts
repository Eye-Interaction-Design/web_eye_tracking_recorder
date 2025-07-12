export function generateSessionId(): string {
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "")
		.replace("T", "_")
		.slice(0, 15);
	const random = Math.random().toString(36).substring(2, 8);
	return `session_${timestamp}_${random}`;
}

export function getBrowserWindowInfo(): {
	innerWidth: number;
	innerHeight: number;
	scrollX: number;
	scrollY: number;
	devicePixelRatio: number;
	screenX: number;
	screenY: number;
	outerWidth: number;
	outerHeight: number;
} {
	const win = typeof window !== "undefined" ? window : ({} as any);
	return {
		innerWidth: win.innerWidth || 1920,
		innerHeight: win.innerHeight || 1080,
		scrollX: win.scrollX || 0,
		scrollY: win.scrollY || 0,
		devicePixelRatio: win.devicePixelRatio || 1,
		screenX: win.screenX || 0,
		screenY: win.screenY || 0,
		outerWidth: win.outerWidth || 1920,
		outerHeight: win.outerHeight || 1080,
	};
}

export function getScreenInfo(): {
	width: number;
	height: number;
	availWidth: number;
	availHeight: number;
} {
	const scr = typeof screen !== "undefined" ? screen : ({} as any);
	return {
		width: scr.width || 1920,
		height: scr.height || 1080,
		availWidth: scr.availWidth || 1920,
		availHeight: scr.availHeight || 1040,
	};
}

export function convertScreenToWindowCoordinates(
	screenX: number,
	screenY: number,
	windowInfo: ReturnType<typeof getBrowserWindowInfo>,
): { windowX: number; windowY: number } {
	return {
		windowX: screenX - windowInfo.screenX,
		windowY: screenY - windowInfo.screenY,
	};
}
