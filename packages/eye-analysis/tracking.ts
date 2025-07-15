// Eye tracking and mouse simulation tracking utilities

import { interactionState } from "./interaction"
import { addGazeData } from "./recorder/core"
import type { CalibrationResult, GazePointInput } from "./recorder/types"

// Tracking state management
interface TrackingState {
  onCalibrationCallback?: (result: CalibrationResult) => void
  eyeTrackingServerUrl?: string
  mouseTrackingActive: boolean
  eyeTrackingConnected: boolean
  mouseTrackingCleanup?: () => void
  eyeTrackingCleanup?: () => void
}

const trackingState: TrackingState = {
  mouseTrackingActive: false,
  eyeTrackingConnected: false,
}

/**
 * Get current tracking mode
 */
export const getTrackingMode = ():
  | "eye-tracking"
  | "mouse-simulation"
  | "idle" => {
  if (trackingState.eyeTrackingConnected) {
    return "eye-tracking"
  } else if (trackingState.mouseTrackingActive) {
    return "mouse-simulation"
  } else {
    return "idle"
  }
}

/**
 * Check if eye tracking is connected
 */
export const isEyeTrackingConnected = (): boolean => {
  return trackingState.eyeTrackingConnected
}

/**
 * Get current eye tracking server URL
 */
export const getCurrentEyeTrackingServerUrl = (): string | undefined => {
  return trackingState.eyeTrackingServerUrl
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
 * Connect to eye tracking server
 */
export const connectToEyeTrackingServer = async (
  serverUrl: string,
): Promise<void> => {
  if (trackingState.eyeTrackingConnected) {
    disconnectFromEyeTrackingServer()
  }

  return new Promise((resolve, reject) => {
    try {
      const websocket = new WebSocket(serverUrl)

      const timeout = setTimeout(() => {
        websocket.close()
        reject(new Error("Connection timeout"))
      }, 10000)

      websocket.onopen = () => {
        clearTimeout(timeout)
        trackingState.eyeTrackingConnected = true
        trackingState.eyeTrackingServerUrl = serverUrl
        console.log("Connected to eye tracking server:", serverUrl)
        resolve()
      }

      websocket.onerror = (error) => {
        clearTimeout(timeout)
        console.error("WebSocket error:", error)
        reject(new Error("Failed to connect to eye tracking server"))
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleEyeTrackingData(data)
        } catch (error) {
          console.error("Failed to parse eye tracking data:", error)
        }
      }

      websocket.onclose = () => {
        trackingState.eyeTrackingConnected = false
        console.log("Disconnected from eye tracking server")
      }

      trackingState.eyeTrackingCleanup = () => {
        websocket.close()
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Disconnect from eye tracking server
 */
export const disconnectFromEyeTrackingServer = (): void => {
  if (trackingState.eyeTrackingCleanup) {
    trackingState.eyeTrackingCleanup()
    trackingState.eyeTrackingCleanup = undefined
  }

  trackingState.eyeTrackingConnected = false
  trackingState.eyeTrackingServerUrl = undefined
}

/**
 * Start mouse tracking for gaze simulation
 */
export const startMouseTracking = (): void => {
  if (trackingState.mouseTrackingActive) return

  trackingState.mouseTrackingActive = true

  const handleMouseMove = (event: MouseEvent) => {
    if (!trackingState.mouseTrackingActive) return

    // Generate simulated gaze data from mouse position
    const gazePoint: GazePointInput = {
      screenX: event.screenX,
      screenY: event.screenY,
      confidence: 0.8 + Math.random() * 0.2,
      leftEye: {
        screenX: event.screenX - 2 + Math.random() * 2,
        screenY: event.screenY + Math.random() * 2,
        pupilSize: 3 + Math.random() * 2,
      },
      rightEye: {
        screenX: event.screenX + 2 + Math.random() * 2,
        screenY: event.screenY + Math.random() * 2,
        pupilSize: 3 + Math.random() * 2,
      },
    }

    addGazeData(gazePoint)
      .then((gazePoint) => {
        interactionState.onGazeDataCallback?.(gazePoint)
      })
      .catch(console.error)
  }

  document.addEventListener("mousemove", handleMouseMove)

  trackingState.mouseTrackingCleanup = () => {
    document.removeEventListener("mousemove", handleMouseMove)
    trackingState.mouseTrackingCleanup = undefined
  }
}

/**
 * Stop mouse tracking
 */
export const stopMouseTracking = (): void => {
  trackingState.mouseTrackingActive = false
  if (trackingState.mouseTrackingCleanup) {
    trackingState.mouseTrackingCleanup()
  }
}

/**
 * Check if mouse tracking is active
 */
export const isMouseTrackingActive = (): boolean => {
  return trackingState.mouseTrackingActive
}

/**
 * Set calibration callback
 */
export const onCalibration = (
  callback: (result: CalibrationResult) => void,
): void => {
  trackingState.onCalibrationCallback = callback
}

// Handle eye tracking data from server
const handleEyeTrackingData = async (data: unknown): Promise<void> => {
  if (!data || typeof data !== "object") {
    return
  }

  const messageData = data as Record<string, unknown>

  const gazeInput: GazePointInput = {
    screenX: (messageData.screenX as number) || 0,
    screenY: (messageData.screenY as number) || 0,
    confidence: (messageData.confidence as number) || 0.5,
    leftEye: {
      screenX:
        ((messageData.leftEye as Record<string, unknown>)?.screenX as number) ||
        (messageData.screenX as number) ||
        0,
      screenY:
        ((messageData.leftEye as Record<string, unknown>)?.screenY as number) ||
        (messageData.screenY as number) ||
        0,
      pupilSize:
        ((messageData.leftEye as Record<string, unknown>)
          ?.pupilSize as number) || 3,
    },
    rightEye: {
      screenX:
        ((messageData.rightEye as Record<string, unknown>)
          ?.screenX as number) ||
        (messageData.screenX as number) ||
        0,
      screenY:
        ((messageData.rightEye as Record<string, unknown>)
          ?.screenY as number) ||
        (messageData.screenY as number) ||
        0,
      pupilSize:
        ((messageData.rightEye as Record<string, unknown>)
          ?.pupilSize as number) || 3,
    },
  }

  try {
    const gazePoint = await addGazeData(gazeInput)
    interactionState.onGazeDataCallback?.(gazePoint)
  } catch (error) {
    console.error("Failed to add gaze data:", error)
  }
  //   } else if (messageData.type === "calibration_result") {
  //     const result = {
  //       success: (messageData.success as boolean) || false,
  //       accuracy: messageData.accuracy as number,
  //       precision: messageData.precision as number,
  //       errorMessage: messageData.errorMessage as string,
  //       points: messageData.points as Array<{
  //         x: number;
  //         y: number;
  //         accuracy: number;
  //       }>,
  //     } as CalibrationResult;
  //     if (trackingState.onCalibrationCallback) {
  //       trackingState.onCalibrationCallback(result);
  //     }
  //   }
}
