// Coordinate transformation functions (function-based implementation)

import type { SessionInfo, WindowState } from "./types"

// Conversion to recording video coordinates (contentX/Y)
export function transformToContentCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): { contentX: number; contentY: number } {
  switch (sessionInfo.recordingMode) {
    case "full-screen":
      // Full screen recording: set both screenX/Y and contentX/Y to 0 for simplicity
      return {
        contentX: 0,
        contentY: 0,
      }

    case "current-tab":
      if (!windowState) {
        throw new Error("WindowState is required for current-tab recording")
      }

      // Current tab recording: convert to window-based coordinates
      return {
        contentX: screenX - windowState.screenX,
        contentY: screenY - windowState.screenY,
      }

    // Temporarily disabled browser-window mode
    // case "browser-window":
    //   if (!windowState) {
    //     throw new Error("WindowState is required for browser-window recording")
    //   }
    //
    //   // Browser window recording: convert to window-based coordinates
    //   return {
    //     contentX: screenX - windowState.screenX,
    //     contentY: screenY - windowState.screenY,
    //   }

    default:
      throw new Error(
        `Unsupported recording mode: ${sessionInfo.recordingMode}`,
      )
  }
}

// Conversion to web page coordinates (only for current-tab case)
export function transformToPageCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): { pageX: number; pageY: number } | null {
  if (sessionInfo.recordingMode !== "current-tab" || !windowState) {
    return null
  }

  const contentCoords = transformToContentCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )

  return {
    pageX: contentCoords.contentX + windowState.scrollX,
    pageY: contentCoords.contentY + windowState.scrollY,
  }
}

// Conversion to normalized coordinates (0-1)
export function transformToNormalizedCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): { normalizedX: number; normalizedY: number } {
  const contentCoords = transformToContentCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )

  let width: number, height: number

  if (sessionInfo.recordingMode === "full-screen") {
    // For full-screen mode, we set coordinates to 0, so normalization is also 0
    return {
      normalizedX: 0,
      normalizedY: 0,
    }
  } else {
    if (!windowState) {
      throw new Error(
        "WindowState is required for window-based recording normalization",
      )
    }
    width = windowState.innerWidth
    height = windowState.innerHeight
  }

  return {
    normalizedX: Math.max(0, Math.min(1, contentCoords.contentX / width)),
    normalizedY: Math.max(0, Math.min(1, contentCoords.contentY / height)),
  }
}

// Determine if gaze data is within range
export function isGazeWithinRecordingBounds(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): boolean {
  const contentCoords = transformToContentCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )

  if (sessionInfo.recordingMode === "full-screen") {
    // Always true for full screen recording
    return true
  } else {
    if (!windowState) {
      return false
    }

    // Determine if within window
    return (
      contentCoords.contentX >= 0 &&
      contentCoords.contentX <= windowState.innerWidth &&
      contentCoords.contentY >= 0 &&
      contentCoords.contentY <= windowState.innerHeight
    )
  }
}

// Batch conversion to multiple coordinate systems
export function transformGazeCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
) {
  const contentCoords = transformToContentCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )
  const pageCoords = transformToPageCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )
  const normalizedCoords = transformToNormalizedCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )
  const isWithinBounds = isGazeWithinRecordingBounds(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )

  return {
    screen: { x: screenX, y: screenY },
    content: contentCoords,
    page: pageCoords,
    normalized: normalizedCoords,
    isWithinBounds,
  }
}
