// Coordinate transformation functions (function-based implementation)

import type { SessionInfo, WindowState } from "./types"

// Conversion from screen coordinates to recording video coordinates (contentX/Y)
export function transformToContentCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): { contentX: number; contentY: number } {
  switch (sessionInfo.recordingMode) {
    case "full-screen":
      // Full screen recording: contentX/Y equals screenX/Y
      return {
        contentX: screenX,
        contentY: screenY,
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

// Conversion from screen coordinates to web page coordinates (only for current-tab case)
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

// Conversion from screen coordinates to normalized coordinates (0-1)
export function transformToNormalizedCoordinates(
  screenX: number,
  screenY: number,
  sessionInfo: SessionInfo,
  windowState?: WindowState,
): { normalizedX: number; normalizedY: number } {
  let contentWidth: number
  let contentHeight: number

  if (sessionInfo.recordingMode === "full-screen") {
    // For full-screen, use screen dimensions from sessionInfo
    contentWidth = sessionInfo.recordingReference?.screen?.width ?? 1920
    contentHeight = sessionInfo.recordingReference?.screen?.height ?? 1080
  } else if (sessionInfo.recordingMode === "current-tab") {
    if (!windowState) {
      throw new Error(
        "WindowState is required for current-tab recording normalization",
      )
    }
    contentWidth = windowState.innerWidth
    contentHeight = windowState.innerHeight
  } else {
    throw new Error(`Unsupported recording mode: ${sessionInfo.recordingMode}`)
  }

  const contentCoords = transformToContentCoordinates(
    screenX,
    screenY,
    sessionInfo,
    windowState,
  )

  return {
    normalizedX: Math.max(
      0,
      Math.min(1, contentCoords.contentX / contentWidth),
    ),
    normalizedY: Math.max(
      0,
      Math.min(1, contentCoords.contentY / contentHeight),
    ),
  }
}

// Determine if gaze data is within recording bounds
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

// Batch conversion to multiple coordinate systems for screen coordinates
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
