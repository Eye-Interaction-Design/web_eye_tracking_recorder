// High-level experiment API that wraps core functionality
// Integrates experiment-recorder.ts and demo-logic.ts functionality

import { interactionState } from "./interaction"
import {
  addEvent as coreAddEvent,
  createSession as coreCreateSession,
  initialize as coreInitialize,
  startRecording as coreStartRecording,
  stopRecording as coreStopRecording,
  isRecording as getCoreRecording,
  getCurrentSession as getCoreSession,
  getCurrentState as getCoreState,
} from "./recorder/core"
import {
  downloadSession as coreDownloadSession,
  type DownloadSessionOptions,
} from "./recorder/export"
import { subscribe } from "./recorder/state"
import type {
  ExperimentConfig,
  GazePoint,
  GazePointInput,
  QualityMetrics,
  RecorderState,
  RecordingConfig,
  RecordingMode,
  SessionConfig,
  SessionEvent,
  SessionInfo,
} from "./recorder/types"
import { connectTrackingAdaptor } from "./tracking"
import type { TrackingAdaptor } from "./tracking/types"

// Callback types for experiment API
export type GazeDataCallback = (gazePoint: GazePoint) => void
export type SessionEventCallback = (event: SessionEvent) => void

/**
 * Initialize the experiment system with tracking adaptor
 */
export const initialize = async (config?: {
  trackingAdaptor?: TrackingAdaptor
  onlyCurrentTabAvailable?: boolean
}): Promise<void> => {
  await coreInitialize()

  // Connect tracking adaptor if provided
  if (config?.trackingAdaptor) {
    await connectTrackingAdaptor(config.trackingAdaptor)
  }

  // Store recording mode config for later use
  const { dispatch } = await import("./recorder/state")
  dispatch({
    type: "SET_RECORDING_CONFIG",
    payload: {
      availableRecordingModes: config?.onlyCurrentTabAvailable
        ? ["current-tab"]
        : ["current-tab", "full-screen"],
    },
  })
}

/**
 * Create a new experiment session
 */
export const createSession = async (
  config: ExperimentConfig,
): Promise<string> => {
  const sessionConfig: SessionConfig = {
    participantId: config.participantId,
    experimentType: config.experimentType,
    sessionId: config.sessionId,
  }

  const recordingConfig: RecordingConfig = {
    frameRate: 30,
    quality: "high",
    videoFormat: "webm",
    chunkDuration: 5,
    ...config.recording,
  }

  // Create session with metadata
  return await coreCreateSession(sessionConfig, recordingConfig, true, {
    recordingMode: config.recording?.captureEntireScreen
      ? "full-screen"
      : "current-tab",
  })
}

/**
 * Start experiment recording (tracking adaptors should already be connected)
 * If no session exists, creates a default session automatically
 */
export const startRecording = async (
  config?: ExperimentConfig,
): Promise<string> => {
  // Check if a session already exists
  const currentSession = getCurrentSession()

  if (!currentSession && config) {
    // Create a session if none exists and config is provided
    const sessionId = await createSession(config)
    await coreStartRecording()
    return sessionId
  } else if (!currentSession) {
    throw new Error("No active session and no config provided to create one")
  } else {
    // Session exists, just start recording
    await coreStartRecording()
    return currentSession.sessionId
  }
}

/**
 * Stop experiment recording and end session
 */
export const stopRecording = async (): Promise<{
  sessionId: string
  sessionInfo: SessionInfo | null
}> => {
  // Disconnect all tracking adaptors
  const { disconnectAllTrackingAdaptors } = await import("./tracking/index")
  await disconnectAllTrackingAdaptors()

  // Stop recording and get session info
  const sessionInfo = await coreStopRecording()
  const currentSession = getCurrentSession()

  // Clear the session after stopping to allow creating new sessions
  const { dispatch } = await import("./recorder/state")
  dispatch({ type: "CLEAR_SESSION" })

  return {
    sessionId: currentSession?.sessionId || "",
    sessionInfo,
  }
}

/**
 * Add experiment event (enhanced with callbacks)
 */
export const addSessionEvent = async (
  type: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  const event = await coreAddEvent(type, data)
  interactionState.onSessionEventCallback?.(event)
}

/**
 * Set session event callback
 */
export const onSessionEvent = (callback: SessionEventCallback): void => {
  interactionState.onSessionEventCallback = callback
}

/**
 * Subscribe to gaze data
 */
export const onGaze = (callback: (gaze: GazePoint) => void): void => {
  interactionState.onGazeDataCallback = callback
}

/**
 * Subscribe to experiment state changes
 */
export const onStateChanged = (
  callback: (state: RecorderState) => void,
): (() => void) => {
  return subscribe(callback)
}

/**
 * Subscribe to state changes (alias for onStateChanged)
 */
export { subscribe } from "./recorder/state"

/**
 * Add event (alias for addSessionEvent)
 */
export const addEvent = addSessionEvent

/**
 * Get current experiment state
 */
export const getCurrentState = (): RecorderState => {
  return getCoreState()
}

/**
 * Get current experiment session
 */
export const getCurrentSession = (): SessionInfo | null => {
  return getCoreSession()
}

/**
 * Check if experiment is currently recording
 */
export const isRecording = (): boolean => {
  return getCoreRecording()
}

// Download and export functions with improved interface

/**
 * Re-export DownloadSessionOptions type
 */
export type { DownloadSessionOptions } from "./recorder/export"

/**
 * Download session data with flexible options
 */
export const downloadSession = async (
  sessionId?: string,
  options: DownloadSessionOptions = {},
): Promise<void> => {
  const targetSessionId = sessionId || getCurrentSession()?.sessionId
  if (!targetSessionId) throw new Error("No session available")

  await coreDownloadSession(targetSessionId, options)
}

// Re-export core recorder functions for direct access
export {
  addEvent as coreAddEvent,
  createSession as coreCreateSession,
  initialize as coreInitialize,
  startRecording as coreStartRecording,
  stopRecording as coreStopRecording,
  isRecording as getCoreRecording,
  getCurrentSession as getCoreSession,
  getCurrentState as getCoreState,
} from "./recorder/core"

// Re-export export functions
export {
  downloadSession as coreDownloadSession,
  exportExperimentDataset,
  gazeDataToCSV,
  eventsToCSV,
  createMetadataJSON,
  downloadFile,
  createSessionSummaryText,
  type DownloadSessionOptions as CoreDownloadSessionOptions,
} from "./recorder/export"

// Re-export state management
export {
  subscribe as coreSubscribe,
  dispatch as coreDispatch,
  getState as getCoreRecorderState,
} from "./recorder/state"

// Re-export storage functions
export {
  initializeStorage,
  saveGazeData,
  saveEvent,
  saveVideoChunk,
  getSessionData,
  getAllSessions,
  deleteSession,
  resetDatabase,
  saveSession,
  getSession,
  getVideoChunkData,
  getStorageUsage,
  cleanupOldVideoChunks,
  autoCleanupStorage,
} from "./recorder/storage"

// Export all types for convenience
export type {
  SessionConfig,
  RecordingConfig,
  RecordingMode,
  SessionInfo,
  SessionEvent,
  GazePoint,
  GazePointInput,
  RecorderState,
  ExperimentConfig,
  QualityMetrics,
}
