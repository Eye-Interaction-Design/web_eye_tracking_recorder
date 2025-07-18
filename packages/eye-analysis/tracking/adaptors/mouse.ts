// Mouse tracking adaptor implementation

import type { GazePointInput } from "../../recorder/types"
import { handleGazeData } from "../manager"
import type { FunctionBasedAdaptor, TrackingStatus } from "../types"

/**
 * Mouse tracking adaptor options
 */
export interface MouseAdaptorOptions {
  confidenceRange?: [number, number]
  saccadeSimulation?: boolean
  blinkSimulation?: boolean
  updateInterval?: number
  noiseAmount?: number
  pupilSizeVariation?: number
}

/**
 * Create a mouse tracking adaptor for gaze simulation
 */
export const mouseTrackingAdaptor = (
  options: MouseAdaptorOptions = {},
): FunctionBasedAdaptor => {
  let isActive = false
  let cleanup: (() => void) | null = null
  let lastMousePosition = { x: 0, y: 0 }
  let _velocity = { x: 0, y: 0 }
  let status: TrackingStatus = {
    connected: false,
    tracking: false,
    quality: "good",
    message: "Mouse simulation",
  }

  const adaptor: FunctionBasedAdaptor = {
    id: "mouse-tracking",
    name: "Mouse Tracking Simulation",

    async connect(): Promise<void> {
      if (isActive) return

      isActive = true
      status = {
        connected: true,
        tracking: true,
        quality: "good",
        message: "Mouse simulation active",
      }
      adaptor.onStatusChange?.(status)

      const handleMouseMove = (event: MouseEvent) => {
        if (!isActive) return

        // Calculate velocity for saccade simulation
        const deltaX = event.screenX - lastMousePosition.x
        const deltaY = event.screenY - lastMousePosition.y
        _velocity = { x: deltaX, y: deltaY }
        lastMousePosition = { x: event.screenX, y: event.screenY }

        // Generate confidence based on movement speed
        const speed = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        let baseConfidence = options.confidenceRange
          ? options.confidenceRange[0] +
            Math.random() *
              (options.confidenceRange[1] - options.confidenceRange[0])
          : 0.8 + Math.random() * 0.2

        // Reduce confidence during fast movements (saccades)
        if (options.saccadeSimulation && speed > 50) {
          baseConfidence *= 0.5
        }

        // Add noise for realism
        const noiseAmount = options.noiseAmount || 2
        const noiseX = (Math.random() - 0.5) * noiseAmount
        const noiseY = (Math.random() - 0.5) * noiseAmount

        // Generate pupil size variation
        const basePupilSize = 3
        const pupilVariation = options.pupilSizeVariation || 1
        const leftPupilSize =
          basePupilSize + (Math.random() - 0.5) * pupilVariation
        const rightPupilSize =
          basePupilSize + (Math.random() - 0.5) * pupilVariation

        const gazePoint: GazePointInput = {
          screenX: event.screenX + noiseX,
          screenY: event.screenY + noiseY,
          confidence: Math.max(0.1, Math.min(1.0, baseConfidence)),
          normalized: false, // Screen coordinates, not normalized
          leftEye: {
            screenX: event.screenX - 2 + noiseX + Math.random() * 2,
            screenY: event.screenY + noiseY + Math.random() * 2,
            pupilSize: Math.max(1, leftPupilSize),
          },
          rightEye: {
            screenX: event.screenX + 2 + noiseX + Math.random() * 2,
            screenY: event.screenY + noiseY + Math.random() * 2,
            pupilSize: Math.max(1, rightPupilSize),
          },
        }

        handleGazeData(gazePoint, adaptor.id).catch(console.error)
      }

      let blinkTimer: ReturnType<typeof setInterval> | null = null

      // Simulate blinks by temporarily reducing confidence
      if (options.blinkSimulation) {
        blinkTimer = setInterval(
          () => {
            if (isActive && Math.random() < 0.1) {
              // 10% chance of blink every interval
              status = {
                ...status,
                quality: "poor",
                message: "Simulated blink",
              }
              adaptor.onStatusChange?.(status)

              setTimeout(
                () => {
                  if (isActive) {
                    status = {
                      ...status,
                      quality: "good",
                      message: "Mouse simulation active",
                    }
                    adaptor.onStatusChange?.(status)
                  }
                },
                100 + Math.random() * 200,
              ) // Blink duration 100-300ms
            }
          },
          3000 + Math.random() * 2000,
        ) // Blink every 3-5 seconds
      }

      document.addEventListener("mousemove", handleMouseMove)
      cleanup = () => {
        document.removeEventListener("mousemove", handleMouseMove)
        if (blinkTimer) {
          clearInterval(blinkTimer)
        }
        cleanup = null
      }
    },

    async disconnect(): Promise<void> {
      isActive = false
      cleanup?.()
      status = { connected: false, tracking: false, quality: "unavailable" }
      adaptor.onStatusChange?.(status)
    },

    isConnected(): boolean {
      return isActive
    },

    getStatus(): TrackingStatus {
      return status
    },

    setupFunction: (onGaze: (gazePoint: GazePointInput) => void) => {
      // This is mainly for backward compatibility with function-based API
      const handleMouseMove = (event: MouseEvent) => {
        const noiseX = (Math.random() - 0.5) * 2
        const noiseY = (Math.random() - 0.5) * 2

        const gazePoint: GazePointInput = {
          screenX: event.screenX + noiseX,
          screenY: event.screenY + noiseY,
          confidence: 0.8 + Math.random() * 0.2,
          leftEye: {
            screenX: event.screenX - 2 + noiseX,
            screenY: event.screenY + noiseY,
            pupilSize: 3 + Math.random() * 0.5,
          },
          rightEye: {
            screenX: event.screenX + 2 + noiseX,
            screenY: event.screenY + noiseY,
            pupilSize: 3 + Math.random() * 0.5,
          },
        }
        onGaze(gazePoint)
      }

      document.addEventListener("mousemove", handleMouseMove)
      return () => document.removeEventListener("mousemove", handleMouseMove)
    },
  }

  return adaptor
}

/**
 * Get mouse position for debugging
 */
export const getCurrentMousePosition = (): { x: number; y: number } => {
  return { x: 0, y: 0 } // This would need to be implemented with actual mouse tracking
}

/**
 * Validate mouse adaptor options
 */
export const validateMouseAdaptorOptions = (
  options: MouseAdaptorOptions,
): string[] => {
  const errors: string[] = []

  if (
    options.confidenceRange &&
    (options.confidenceRange[0] < 0 ||
      options.confidenceRange[1] > 1 ||
      options.confidenceRange[0] >= options.confidenceRange[1])
  ) {
    errors.push("confidenceRange must be [min, max] where 0 ≤ min < max ≤ 1")
  }

  if (options.updateInterval && options.updateInterval < 1) {
    errors.push("updateInterval must be at least 1ms")
  }

  if (options.noiseAmount && options.noiseAmount < 0) {
    errors.push("noiseAmount must be non-negative")
  }

  if (options.pupilSizeVariation && options.pupilSizeVariation < 0) {
    errors.push("pupilSizeVariation must be non-negative")
  }

  return errors
}
