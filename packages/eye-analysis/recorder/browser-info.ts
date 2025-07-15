// Browser and screen information collection utilities

import type { ScreenInfo, WindowInfo } from "./types"

// Screen details interface for Window Management API
export interface ScreenDetailed {
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
  left: number
  top: number
  width: number
  height: number
  isPrimary: boolean
  isInternal: boolean
  devicePixelRatio: number
  label?: string
}

export interface ScreenDetails {
  screens: ScreenDetailed[]
  currentScreen: ScreenDetailed
}

// Cache for screen details to avoid repeated API calls
let cachedScreenDetails: ScreenDetails | null = null
let screenDetailsPromise: Promise<ScreenDetails | null> | null = null

/**
 * Get current browser window information
 */
export const getBrowserWindowInfo = (): WindowInfo => {
  if (typeof window === "undefined") {
    // Fallback for SSR or non-browser environments
    return {
      innerWidth: 1920,
      innerHeight: 1080,
      scrollX: 0,
      scrollY: 0,
      devicePixelRatio: 1.0,
      screenX: 0,
      screenY: 0,
      outerWidth: 1920,
      outerHeight: 1080,
    }
  }

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

/**
 * Get current screen information
 */
export const getScreenInfo = (): ScreenInfo => {
  if (typeof screen === "undefined") {
    // Fallback for SSR or non-browser environments
    return {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040,
    }
  }

  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
  }
}

/**
 * Check if Window Management API is supported
 */
export const isWindowManagementAPISupported = (): boolean => {
  return typeof window !== "undefined" && "getScreenDetails" in window
}

/**
 * Get screen details using Window Management API
 */
export const getScreenDetails = async (): Promise<ScreenDetails | null> => {
  if (!isWindowManagementAPISupported()) {
    return null
  }

  // Return cached result if available
  if (cachedScreenDetails) {
    return cachedScreenDetails
  }

  // Return existing promise if already in progress
  if (screenDetailsPromise) {
    return screenDetailsPromise
  }

  screenDetailsPromise = (async () => {
    try {
      const screenDetails = await window.getScreenDetails?.()
      if (screenDetails) {
        cachedScreenDetails = screenDetails
        return screenDetails
      }
      return null
    } catch (error) {
      console.warn("Failed to get screen details:", error)
      return null
    } finally {
      screenDetailsPromise = null
    }
  })()

  return screenDetailsPromise
}

/**
 * Get the screen that contains the current window
 */
export const getCurrentScreen = async (): Promise<ScreenDetailed | null> => {
  const screenDetails = await getScreenDetails()
  if (!screenDetails) return null

  const windowInfo = getBrowserWindowInfo()
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
      return screen
    }
  }

  // Fallback to primary screen
  return (
    screenDetails.screens.find((screen) => screen.isPrimary) ||
    screenDetails.screens[0] ||
    null
  )
}

/**
 * Convert screen coordinates to window coordinates
 * Uses Window Management API when available to get proper screen-relative coordinates
 */
export const screenToWindowCoordinates = async (
  screenX: number,
  screenY: number,
  windowInfo: WindowInfo,
): Promise<{ windowX: number; windowY: number }> => {
  const currentScreen = await getCurrentScreen()

  if (currentScreen) {
    // Convert desktop coordinates to screen-relative coordinates
    const screenRelativeX = screenX - currentScreen.left
    const screenRelativeY = screenY - currentScreen.top

    // Then convert to window coordinates
    return {
      windowX: screenRelativeX - (windowInfo.screenX - currentScreen.left),
      windowY: screenRelativeY - (windowInfo.screenY - currentScreen.top),
    }
  }

  // Fallback to original behavior
  return {
    windowX: screenX - windowInfo.screenX,
    windowY: screenY - windowInfo.screenY,
  }
}

/**
 * Synchronous version of screenToWindowCoordinates for backward compatibility
 */
export const screenToWindowCoordinatesSync = (
  screenX: number,
  screenY: number,
  windowInfo: WindowInfo,
): { windowX: number; windowY: number } => {
  return {
    windowX: screenX - windowInfo.screenX,
    windowY: screenY - windowInfo.screenY,
  }
}

/**
 * Convert window coordinates to screen coordinates
 * Uses Window Management API when available to get proper desktop coordinates
 */
export const windowToScreenCoordinates = async (
  windowX: number,
  windowY: number,
  windowInfo: WindowInfo,
): Promise<{ screenX: number; screenY: number }> => {
  const currentScreen = await getCurrentScreen()

  if (currentScreen) {
    // Convert window coordinates to screen-relative coordinates
    const screenRelativeX = windowX + (windowInfo.screenX - currentScreen.left)
    const screenRelativeY = windowY + (windowInfo.screenY - currentScreen.top)

    // Then convert to desktop coordinates
    return {
      screenX: screenRelativeX + currentScreen.left,
      screenY: screenRelativeY + currentScreen.top,
    }
  }

  // Fallback to original behavior
  return {
    screenX: windowX + windowInfo.screenX,
    screenY: windowY + windowInfo.screenY,
  }
}

/**
 * Synchronous version of windowToScreenCoordinates for backward compatibility
 */
export const windowToScreenCoordinatesSync = (
  windowX: number,
  windowY: number,
  windowInfo: WindowInfo,
): { screenX: number; screenY: number } => {
  return {
    screenX: windowX + windowInfo.screenX,
    screenY: windowY + windowInfo.screenY,
  }
}

/**
 * Calculate content coordinates (considering scroll)
 */
export const windowToContentCoordinates = (
  windowX: number,
  windowY: number,
  windowInfo: WindowInfo,
): { contentX: number; contentY: number } => {
  return {
    contentX: windowX + windowInfo.scrollX,
    contentY: windowY + windowInfo.scrollY,
  }
}
