// High-level experiment API that wraps core functionality
// Integrates experiment-recorder.ts and demo-logic.ts functionality

import {
  addEvent as coreAddEvent,
  addGazeData as coreAddGazeData,
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
  CalibrationResult,
  ExperimentConfig,
  EyeTrackingConfig,
  GazePoint,
  GazePointInput,
  QualityMetrics,
  RecorderState,
  RecordingConfig,
  SessionConfig,
  SessionEvent,
  SessionInfo,
} from "./recorder/types"

// Callback types for experiment API
export type GazeDataCallback = (gazePoint: GazePoint) => void
export type SessionEventCallback = (event: SessionEvent) => void
export type CalibrationCallback = (result: CalibrationResult) => void

// Experiment state management
interface ExperimentState {
  onGazeDataCallback?: GazeDataCallback
  onSessionEventCallback?: SessionEventCallback
  eyeTrackingServerUrl?: string
}

const experimentState: ExperimentState = {}

// Enhanced gaze data handler that triggers callbacks
const handleGazeData = (gazePoint: GazePoint) => {
  if (experimentState.onGazeDataCallback) {
    experimentState.onGazeDataCallback(gazePoint)
  }
}

// Enhanced event handler that triggers callbacks
const handleSessionEvent = (event: SessionEvent) => {
  if (experimentState.onSessionEventCallback) {
    experimentState.onSessionEventCallback(event)
  }
}

/**
 * Initialize the experiment system
 */
export const initialize = async (config?: ExperimentConfig): Promise<void> => {
  await coreInitialize()

  // Store eye tracking server URL if provided
  if (config?.eyeTrackingServerUrl) {
    experimentState.eyeTrackingServerUrl = config.eyeTrackingServerUrl
  }
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
  return await coreCreateSession(sessionConfig, recordingConfig, true)
}

/**
 * Start experiment recording with automatic gaze tracking setup
 */
export const startRecording = async (config?: {
  eyeTrackingServerUrl?: string
}): Promise<void> => {
  await coreStartRecording()

  const serverUrl =
    config?.eyeTrackingServerUrl || experimentState.eyeTrackingServerUrl

  // Set up gaze tracking - either real eye tracking or mouse simulation
  const {
    isValidWebSocketUrl,
    connectToEyeTrackingServer,
    startMouseTracking,
  } = await import("./tracking")

  if (serverUrl && isValidWebSocketUrl(serverUrl)) {
    await connectToEyeTrackingServer(serverUrl)
  } else {
    startMouseTracking()
  }
}

/**
 * Stop experiment recording
 */
export const stopRecording = async (): Promise<{
  sessionId: string
  sessionInfo: SessionInfo | null
}> => {
  const { stopMouseTracking, disconnectFromEyeTrackingServer } = await import(
    "./tracking"
  )

  stopMouseTracking()
  disconnectFromEyeTrackingServer()

  const sessionInfo = await coreStopRecording()
  const currentSession = getCurrentSession()

  return {
    sessionId: currentSession?.sessionId || "",
    sessionInfo,
  }
}

/**
 * Add gaze data point (enhanced with callbacks)
 */
export const addGazeData = async (gazeInput: GazePointInput): Promise<void> => {
  await coreAddGazeData(gazeInput)

  // Get the complete gaze point from state to trigger callback
  const state = getCurrentState()
  if (state.gazeDataCount > 0 && experimentState.onGazeDataCallback) {
    // Note: This is a simplified approach - in a real implementation,
    // we'd need to access the actual gaze point that was just added
    // For now, we'll trigger the callback with the input data enhanced
    const enhancedGazePoint = gazeInput as GazePoint
    handleGazeData(enhancedGazePoint)
  }
}

/**
 * Add experiment event (enhanced with callbacks)
 */
export const addExperimentEvent = async (
  type: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  await coreAddEvent(type, data)

  // Trigger callback if set
  if (experimentState.onSessionEventCallback) {
    const currentSession = getCurrentSession()
    if (currentSession) {
      const event: SessionEvent = {
        id: `event_${Date.now()}`,
        sessionId: currentSession.sessionId,
        type: "user_event",
        timestamp: Date.now(),
        data: { eventType: type, ...data },
      }
      handleSessionEvent(event)
    }
  }
}

/**
 * Set gaze data callback
 */
export const onGazeData = (callback: GazeDataCallback): void => {
  experimentState.onGazeDataCallback = callback
}

/**
 * Set session event callback
 */
export const onSessionEvent = (callback: SessionEventCallback): void => {
  experimentState.onSessionEventCallback = callback
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

// Legacy functions for backward compatibility

/**
 * Download session data as JSON (legacy)
 */
export const downloadSessionData = async (
  sessionId?: string,
): Promise<void> => {
  await downloadSession(sessionId, {
    include: { metadata: true, gaze: false, events: false, video: false },
    asZip: false,
  })
}

/**
 * Download session components (legacy)
 */

// Mouse tracking simulation (from demo-logic.ts)

// Eye tracking server connection (from demo-logic.ts)

// Utility functions

/**
 * Record task interaction event
 */
export const recordTaskInteraction = async (
  taskName: string,
  elementType: string = "button",
): Promise<void> => {
  await addExperimentEvent("task_interaction", {
    taskName,
    elementType,
    timestamp: Date.now(),
  })
}

// Export all types for convenience
export type {
  SessionConfig,
  RecordingConfig,
  SessionInfo,
  SessionEvent,
  GazePoint,
  GazePointInput,
  RecorderState,
  ExperimentConfig,
  CalibrationResult,
  QualityMetrics,
  EyeTrackingConfig,
}
