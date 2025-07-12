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
	return {
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight,
		scrollX: window.scrollX,
		scrollY: window.scrollY,
		devicePixelRatio: window.devicePixelRatio,
		screenX: window.screenX,
		screenY: window.screenY,
		outerWidth: window.outerWidth,
		outerHeight: window.outerHeight,
	};
}

export function getScreenInfo(): {
	width: number;
	height: number;
	availWidth: number;
	availHeight: number;
} {
	return {
		width: screen.width,
		height: screen.height,
		availWidth: screen.availWidth,
		availHeight: screen.availHeight,
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
