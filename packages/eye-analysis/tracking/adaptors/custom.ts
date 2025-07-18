// Custom tracking adaptor factory

import type { GazePointInput } from "../../recorder/types"
import { handleGazeData } from "../manager"
import type { FunctionBasedAdaptor, TrackingStatus } from "../types"
import {
  initializeAdaptorState,
  updateAdaptorStatus,
  startTrackingSession,
  stopTrackingSession,
  handleTrackingError,
} from "../common"

/**
 * Custom adaptor setup function type
 */
export type CustomAdaptorSetupFunction = (
  onGaze: (gazePoint: GazePointInput) => void,
) => undefined | (() => void)

/**
 * Custom adaptor options
 */
export interface CustomAdaptorOptions {
  initialQuality?: "excellent" | "good" | "poor" | "unavailable"
  autoStart?: boolean
  description?: string
  metadata?: Record<string, unknown>
}

/**
 * Create a custom function-based tracking adaptor
 */
export const createCustomAdaptor = (
  id: string,
  name: string,
  setupFunction: CustomAdaptorSetupFunction,
  options: CustomAdaptorOptions = {},
): FunctionBasedAdaptor => {
  let isActive = false
  let cleanup: (() => void) | null = null

  const state = initializeAdaptorState(id)
  // Initialize with custom options
  updateAdaptorStatus(id, {
    quality: options.initialQuality || "good",
    message: options.description,
    metadata: options.metadata,
  })

  const adaptor: FunctionBasedAdaptor = {
    id,
    name,

    async connect(): Promise<void> {
      if (isActive) return

      try {
        isActive = true

        updateAdaptorStatus(id, {
          connected: true,
          tracking: true,
          quality: options.initialQuality || "good",
          message: options.description || "Custom adaptor active",
          metadata: options.metadata,
        })

        // Start tracking session
        startTrackingSession(id, `custom-session-${Date.now()}`, {
          trackingMode: "custom",
          adaptorType: name,
          ...options.metadata,
        })

        adaptor.onStatusChange?.(state.status)

        const result = setupFunction((gazePoint: GazePointInput) => {
          if (isActive) {
            handleGazeData(gazePoint, adaptor.id).catch((error) => {
              handleTrackingError(id, error as Error)
              adaptor.onError?.(error)
            })
          }
        })

        if (typeof result === "function") {
          cleanup = result
        }
      } catch (error) {
        isActive = false
        const trackingError = error as Error
        handleTrackingError(id, trackingError)

        updateAdaptorStatus(id, {
          connected: false,
          tracking: false,
          quality: "unavailable",
          message: `Connection failed: ${error}`,
          metadata: options.metadata,
        })

        adaptor.onStatusChange?.(state.status)
        adaptor.onError?.(trackingError)
        throw trackingError
      }
    },

    async disconnect(): Promise<void> {
      isActive = false
      cleanup?.()
      cleanup = null

      stopTrackingSession(id)
      updateAdaptorStatus(id, {
        connected: false,
        tracking: false,
        quality: "unavailable",
        message: "Disconnected",
        metadata: options.metadata,
      })

      adaptor.onStatusChange?.(state.status)
    },

    isConnected(): boolean {
      return isActive
    },

    getStatus(): TrackingStatus {
      return state.status
    },

    setupFunction,
  }

  return adaptor
}

/**
 * Create a data-driven custom adaptor that processes external data
 */
export const createDataDrivenAdaptor = (
  id: string,
  name: string,
  options: CustomAdaptorOptions = {},
): {
  adaptor: FunctionBasedAdaptor
  sendGazeData: (gazePoint: GazePointInput) => Promise<void>
  updateStatus: (newStatus: Partial<TrackingStatus>) => void
} => {
  let sendGazeCallback: ((gazePoint: GazePointInput) => void) | null = null

  const adaptor = createCustomAdaptor(
    id,
    name,
    (onGaze) => {
      sendGazeCallback = onGaze
      return () => {
        sendGazeCallback = null
      }
    },
    options,
  )

  const sendGazeData = async (gazePoint: GazePointInput): Promise<void> => {
    if (sendGazeCallback && adaptor.isConnected()) {
      sendGazeCallback(gazePoint)
    }
  }

  const updateStatus = (newStatus: Partial<TrackingStatus>): void => {
    const currentStatus = adaptor.getStatus()
    const updatedStatus = { ...currentStatus, ...newStatus }
    adaptor.onStatusChange?.(updatedStatus)
  }

  return {
    adaptor,
    sendGazeData,
    updateStatus,
  }
}

/**
 * Create a timer-based custom adaptor for testing
 */
export const createTimerAdaptor = (
  id: string,
  name: string,
  options: {
    interval?: number
    gazeGenerator?: () => GazePointInput
    autoStart?: boolean
  } = {},
): FunctionBasedAdaptor => {
  const defaultGazeGenerator = (): GazePointInput => ({
    screenX: Math.random() * window.screen.width,
    screenY: Math.random() * window.screen.height,
    confidence: 0.7 + Math.random() * 0.3,
    leftEye: {
      screenX: Math.random() * window.screen.width,
      screenY: Math.random() * window.screen.height,
      pupilSize: 2.5 + Math.random() * 1.5,
    },
    rightEye: {
      screenX: Math.random() * window.screen.width,
      screenY: Math.random() * window.screen.height,
      pupilSize: 2.5 + Math.random() * 1.5,
    },
  })

  return createCustomAdaptor(
    id,
    name,
    (onGaze) => {
      const interval = setInterval(() => {
        const gazeData = options.gazeGenerator
          ? options.gazeGenerator()
          : defaultGazeGenerator()
        onGaze(gazeData)
      }, options.interval || 16) // Default ~60 FPS

      return () => clearInterval(interval)
    },
    {
      autoStart: options.autoStart,
      description: `Timer-based adaptor (${options.interval || 16}ms interval)`,
    },
  )
}

/**
 * Create a WebRTC-based custom adaptor
 */
export const createWebRTCAdaptor = (
  id: string,
  name: string,
  peerConnection: RTCPeerConnection,
  options: CustomAdaptorOptions = {},
): FunctionBasedAdaptor => {
  return createCustomAdaptor(
    id,
    name,
    (onGaze) => {
      let dataChannel: RTCDataChannel | null = null

      const handleDataChannel = (event: RTCDataChannelEvent) => {
        dataChannel = event.channel
        dataChannel.onmessage = (messageEvent) => {
          try {
            const gazeData = JSON.parse(messageEvent.data) as GazePointInput
            onGaze(gazeData)
          } catch (error) {
            console.error("Failed to parse WebRTC gaze data:", error)
          }
        }
      }

      peerConnection.ondatachannel = handleDataChannel

      return () => {
        peerConnection.ondatachannel = null
        dataChannel?.close()
      }
    },
    {
      ...options,
      description: options.description || "WebRTC-based eye tracking",
    },
  )
}

/**
 * Validate custom adaptor configuration
 */
export const validateCustomAdaptorConfig = (
  id: string,
  name: string,
  setupFunction: CustomAdaptorSetupFunction,
): string[] => {
  const errors: string[] = []

  if (!id || id.trim() === "") {
    errors.push("ID must be a non-empty string")
  }

  if (!name || name.trim() === "") {
    errors.push("Name must be a non-empty string")
  }

  if (typeof setupFunction !== "function") {
    errors.push("Setup function must be a function")
  }

  // Check for reserved IDs
  const reservedIds = ["websocket", "mouse-tracking", "custom"]
  if (reservedIds.some((reserved) => id.toLowerCase().includes(reserved))) {
    errors.push(
      `ID should not contain reserved keywords: ${reservedIds.join(", ")}`,
    )
  }

  return errors
}

/**
 * Get example custom adaptor configurations
 */
export const getExampleAdaptorConfigs = (): Array<{
  id: string
  name: string
  description: string
  setupFunction: CustomAdaptorSetupFunction
}> => {
  return [
    {
      id: "random-gaze",
      name: "Random Gaze Generator",
      description: "Generates random gaze points for testing",
      setupFunction: (onGaze) => {
        const interval = setInterval(() => {
          onGaze({
            screenX: Math.random() * window.screen.width,
            screenY: Math.random() * window.screen.height,
            confidence: Math.random(),
            leftEye: {
              screenX: Math.random() * window.screen.width,
              screenY: Math.random() * window.screen.height,
              pupilSize: 2 + Math.random() * 2,
            },
            rightEye: {
              screenX: Math.random() * window.screen.width,
              screenY: Math.random() * window.screen.height,
              pupilSize: 2 + Math.random() * 2,
            },
          })
        }, 50)

        return () => clearInterval(interval)
      },
    },
    {
      id: "keyboard-gaze",
      name: "Keyboard Controlled Gaze",
      description: "Control gaze point with arrow keys",
      setupFunction: (onGaze) => {
        let x = window.screen.width / 2
        let y = window.screen.height / 2

        const handleKeyDown = (event: KeyboardEvent) => {
          const step = 10
          switch (event.key) {
            case "ArrowUp":
              y = Math.max(0, y - step)
              break
            case "ArrowDown":
              y = Math.min(window.screen.height, y + step)
              break
            case "ArrowLeft":
              x = Math.max(0, x - step)
              break
            case "ArrowRight":
              x = Math.min(window.screen.width, x + step)
              break
            default:
              return
          }

          onGaze({
            screenX: x,
            screenY: y,
            confidence: 1.0,
            leftEye: { screenX: x - 5, screenY: y, pupilSize: 3 },
            rightEye: { screenX: x + 5, screenY: y, pupilSize: 3 },
          })
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
      },
    },
  ]
}
