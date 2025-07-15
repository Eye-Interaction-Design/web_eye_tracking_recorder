// Utility functions for Eye Analysis

/**
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Generate timestamp string
 */
export const generateTimestamp = (): string => {
  return new Date().toLocaleTimeString()
}

/**
 * Validate WebSocket URL
 */
export const isValidWebSocketUrl = (url: string): boolean => {
  if (!url || url.trim() === "") return false

  try {
    const urlObj = new URL(url)
    return urlObj.protocol === "ws:" || urlObj.protocol === "wss:"
  } catch {
    return false
  }
}

/**
 * Generate unique session ID
 */
export const generateSessionId = (): string => {
  const date = new Date()
  const dateStr = date.toISOString().split("T")[0]
  const timeStr =
    date.getHours().toString().padStart(2, "0") +
    date.getMinutes().toString().padStart(2, "0")
  const randomStr = Math.random().toString(36).substr(2, 6)
  return `session_${dateStr}_${timeStr}_${randomStr}`
}

/**
 * Generate unique event ID
 */
export const generateEventId = (): string => {
  return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate participant ID format
 */
export const isValidParticipantId = (id: string): boolean => {
  return id.trim().length > 0 && id.trim().length <= 100
}

/**
 * Format file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Throttle function execution
 */
export const throttle = <T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
): T => {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return ((...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(
        () => {
          func(...args)
          lastExecTime = Date.now()
        },
        delay - (currentTime - lastExecTime),
      )
    }
  }) as T
}

/**
 * Debounce function execution
 */
export const debounce = <T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
): T => {
  let timeoutId: NodeJS.Timeout | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }) as T
}

// Re-export browser info functions for convenience
export {
  getBrowserWindowInfo,
  getScreenInfo,
  screenToWindowCoordinatesSync as convertScreenToWindowCoordinates,
} from "./recorder/browser-info"
