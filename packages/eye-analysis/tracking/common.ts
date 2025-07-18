// Common tracking utilities and state management

import type { TrackingStatus } from "./types"
import {
  addGazePointForQuality,
  startQualityTracking,
  stopQualityTracking,
} from "./quality"
import {
  addToGazeBuffer,
  startBufferFlush,
  stopBufferFlush,
  flushGazeBuffer,
} from "./buffer"
import type { GazePoint } from "../recorder/types"

export interface TrackingSession {
  sessionId: string
  config: {
    samplingRate?: number
    calibrationPoints?: number
    trackingMode?: string
    [key: string]: unknown
  }
  startTime: number
  adaptorId: string
}

export interface CommonTrackingState {
  isTracking: boolean
  currentSession: TrackingSession | null
  status: TrackingStatus
  errorCount: number
  lastError: Error | null
}

// Global state per adaptor
const adaptorStates = new Map<string, CommonTrackingState>()

/**
 * Initialize tracking state for an adaptor
 */
export const initializeAdaptorState = (
  adaptorId: string,
): CommonTrackingState => {
  const state: CommonTrackingState = {
    isTracking: false,
    currentSession: null,
    status: {
      connected: false,
      tracking: false,
      quality: "unavailable",
    },
    errorCount: 0,
    lastError: null,
  }

  adaptorStates.set(adaptorId, state)
  return state
}

/**
 * Get tracking state for an adaptor
 */
export const getAdaptorState = (adaptorId: string): CommonTrackingState => {
  return adaptorStates.get(adaptorId) || initializeAdaptorState(adaptorId)
}

/**
 * Update tracking status for an adaptor
 */
export const updateAdaptorStatus = (
  adaptorId: string,
  status: Partial<TrackingStatus>,
): void => {
  const state = getAdaptorState(adaptorId)
  state.status = { ...state.status, ...status }
  adaptorStates.set(adaptorId, state)
}

/**
 * Start tracking session with common setup
 */
export const startTrackingSession = (
  adaptorId: string,
  sessionId: string,
  config: TrackingSession["config"] = {},
): void => {
  const state = getAdaptorState(adaptorId)

  state.currentSession = {
    sessionId,
    config,
    startTime: Date.now(),
    adaptorId,
  }
  state.isTracking = true
  state.status.tracking = true

  // Start quality tracking
  startQualityTracking()

  // Start buffer flushing with default handler
  startBufferFlush(
    async (data: GazePoint[]) => {
      // Default: just log the data (adaptors can override this)
      console.log(`Flushing ${data.length} gaze points for ${adaptorId}`)
    },
    (error: Error, _data: GazePoint[]) => {
      handleTrackingError(adaptorId, error)
    },
  )

  adaptorStates.set(adaptorId, state)
}

/**
 * Stop tracking session with common cleanup
 */
export const stopTrackingSession = (adaptorId: string): void => {
  const state = getAdaptorState(adaptorId)

  state.isTracking = false
  state.currentSession = null
  state.status.tracking = false

  // Stop quality tracking
  stopQualityTracking()

  // Stop buffer flushing and flush remaining data
  stopBufferFlush()
  flushGazeBuffer().catch((error) => handleTrackingError(adaptorId, error))

  adaptorStates.set(adaptorId, state)
}

/**
 * Handle tracking errors with common error management
 */
export const handleTrackingError = (adaptorId: string, error: Error): void => {
  const state = getAdaptorState(adaptorId)

  state.errorCount++
  state.lastError = error
  state.status.quality = "poor"
  state.status.message = error.message

  console.error(`Tracking error in ${adaptorId}:`, error)

  adaptorStates.set(adaptorId, state)
}

/**
 * Process gaze data with common quality and buffering
 */
export const processGazeData = (
  adaptorId: string,
  gazePoint: GazePoint,
): void => {
  const state = getAdaptorState(adaptorId)

  if (!state.isTracking) {
    return
  }

  // Add to quality tracking
  addGazePointForQuality(gazePoint)

  // Add to buffer
  addToGazeBuffer(gazePoint)

  // Update status quality based on confidence
  if (gazePoint.confidence !== undefined) {
    const quality =
      gazePoint.confidence > 0.8
        ? "excellent"
        : gazePoint.confidence > 0.6
          ? "good"
          : gazePoint.confidence > 0.4
            ? "poor"
            : "poor"
    state.status.quality = quality
  }

  adaptorStates.set(adaptorId, state)
}

/**
 * Send tracking message (for adaptors that support messaging)
 */
export const sendTrackingMessage = (
  websocket: WebSocket | null,
  type: "start_tracking" | "stop_tracking",
  sessionId: string,
  config?: Record<string, unknown>,
): void => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return
  }

  const message = {
    type,
    sessionId,
    ...(config && { config }),
  }

  websocket.send(JSON.stringify(message))
}

/**
 * Normalize WebSocket URL with suffix
 */
export const normalizeWebSocketURL = (url: string, suffix?: string): string => {
  if (!suffix) return url
  return url.endsWith(suffix) ? url : `${url}${suffix}`
}

/**
 * Get tracking statistics for an adaptor
 */
export const getTrackingStats = (
  adaptorId: string,
): {
  isTracking: boolean
  sessionId: string | null
  uptime: number
  errorCount: number
  lastError: string | null
  status: TrackingStatus
} => {
  const state = getAdaptorState(adaptorId)

  const uptime = state.currentSession
    ? Date.now() - state.currentSession.startTime
    : 0

  return {
    isTracking: state.isTracking,
    sessionId: state.currentSession?.sessionId || null,
    uptime,
    errorCount: state.errorCount,
    lastError: state.lastError?.message || null,
    status: state.status,
  }
}

/**
 * Reset all tracking state for an adaptor
 */
export const resetAdaptorState = (adaptorId: string): void => {
  stopTrackingSession(adaptorId)
  adaptorStates.delete(adaptorId)
}
