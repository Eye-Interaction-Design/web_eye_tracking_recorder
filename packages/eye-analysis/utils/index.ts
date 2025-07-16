export function generateSessionId(): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "")
    .replace("T", "_")
    .slice(0, 15)
  const random = Math.random().toString(36).substring(2, 8)
  return `session_${timestamp}_${random}`
}

export function getBrowserWindowInfo(): {
  innerWidth: number
  innerHeight: number
  scrollX: number
  scrollY: number
  devicePixelRatio: number
  screenX: number
  screenY: number
  outerWidth: number
  outerHeight: number
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
  }
}

export function getScreenInfo(): {
  width: number
  height: number
  availWidth: number
  availHeight: number
} {
  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
  }
}

export function convertScreenToWindowCoordinates(
  screenX: number,
  screenY: number,
  windowInfo: ReturnType<typeof getBrowserWindowInfo>,
): { windowX: number; windowY: number } {
  return {
    windowX: screenX - windowInfo.screenX,
    windowY: screenY - windowInfo.screenY,
  }
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
  if ("getScreenDetails" in window) {
    try {
      const screenDetails = await window.getScreenDetails?.()
      if (!screenDetails) {
        return convertScreenToWindowCoordinates(screenX, screenY, windowInfo)
      }

      const windowCenterX = windowInfo.screenX + windowInfo.outerWidth / 2
      const windowCenterY = windowInfo.screenY + windowInfo.outerHeight / 2

      // Find the screen that contains the window center
      for (const screen of screenDetails.screens) {
        if (
          windowCenterX >= screen.left &&
          windowCenterX < screen.left + screen.width &&
          windowCenterY >= screen.top &&
          windowCenterY < screen.top + screen.height
        ) {
          // Convert desktop coordinates to screen-relative coordinates
          const screenRelativeX = screenX - screen.left
          const screenRelativeY = screenY - screen.top

          // Then convert to window coordinates
          return {
            windowX: screenRelativeX - (windowInfo.screenX - screen.left),
            windowY: screenRelativeY - (windowInfo.screenY - screen.top),
          }
        }
      }
    } catch (error) {
      console.warn("Failed to use Window Management API:", error)
    }
  }

  // Fallback to original behavior
  return convertScreenToWindowCoordinates(screenX, screenY, windowInfo)
}
