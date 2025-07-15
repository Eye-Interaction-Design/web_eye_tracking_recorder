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
	const win = typeof window !== "undefined" ? window : ({} as Partial<Window>);
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
	const scr = typeof screen !== "undefined" ? screen : ({} as Partial<Screen>);
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

/**
 * Enhanced version using Window Management API when available
 */
export async function convertScreenToWindowCoordinatesEnhanced(
	screenX: number,
	screenY: number,
	windowInfo: ReturnType<typeof getBrowserWindowInfo>,
): Promise<{ windowX: number; windowY: number }> {
	// Try to use Window Management API
	if (typeof window !== "undefined" && "getScreenDetails" in window) {
		try {
			const screenDetails = await window.getScreenDetails?.();
			if (!screenDetails) {
				return convertScreenToWindowCoordinates(screenX, screenY, windowInfo);
			}

			const windowCenterX = windowInfo.screenX + windowInfo.outerWidth / 2;
			const windowCenterY = windowInfo.screenY + windowInfo.outerHeight / 2;

			// Find the screen that contains the window center
			for (const screen of screenDetails.screens) {
				if (
					windowCenterX >= screen.left &&
					windowCenterX < screen.left + screen.width &&
					windowCenterY >= screen.top &&
					windowCenterY < screen.top + screen.height
				) {
					// Convert desktop coordinates to screen-relative coordinates
					const screenRelativeX = screenX - screen.left;
					const screenRelativeY = screenY - screen.top;

					// Then convert to window coordinates
					return {
						windowX: screenRelativeX - (windowInfo.screenX - screen.left),
						windowY: screenRelativeY - (windowInfo.screenY - screen.top),
					};
				}
			}
		} catch (error) {
			console.warn("Failed to use Window Management API:", error);
		}
	}

	// Fallback to original behavior
	return convertScreenToWindowCoordinates(screenX, screenY, windowInfo);
}
