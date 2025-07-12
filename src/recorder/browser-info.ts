// Browser and screen information collection utilities

import type { WindowInfo, ScreenInfo } from './types'

/**
 * Get current browser window information
 */
export const getBrowserWindowInfo = (): WindowInfo => {
  if (typeof window === 'undefined') {
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
      outerHeight: 1080
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
    outerHeight: window.outerHeight
  }
}

/**
 * Get current screen information
 */
export const getScreenInfo = (): ScreenInfo => {
  if (typeof screen === 'undefined') {
    // Fallback for SSR or non-browser environments
    return {
      width: 1920,
      height: 1080,
      availWidth: 1920,
      availHeight: 1040
    }
  }

  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight
  }
}

/**
 * Convert screen coordinates to window coordinates
 */
export const screenToWindowCoordinates = (
  screenX: number,
  screenY: number,
  windowInfo: WindowInfo
): { windowX: number; windowY: number } => {
  return {
    windowX: screenX - windowInfo.screenX,
    windowY: screenY - windowInfo.screenY
  }
}

/**
 * Convert window coordinates to screen coordinates  
 */
export const windowToScreenCoordinates = (
  windowX: number,
  windowY: number,
  windowInfo: WindowInfo
): { screenX: number; screenY: number } => {
  return {
    screenX: windowX + windowInfo.screenX,
    screenY: windowY + windowInfo.screenY
  }
}

/**
 * Calculate content coordinates (considering scroll)
 */
export const windowToContentCoordinates = (
  windowX: number,
  windowY: number,
  windowInfo: WindowInfo
): { contentX: number; contentY: number } => {
  return {
    contentX: windowX + windowInfo.scrollX,
    contentY: windowY + windowInfo.scrollY
  }
}