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

/**
 * Initialize the experiment system
 */
export const initialize = async (): Promise<void> => {
  await coreInitialize()

  // TODO: eye tracking server url etc. should be configured here
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

  // Create session with metadata (default is current-tab)
  return await coreCreateSession(sessionConfig, recordingConfig, true, {
    recordingMode: "current-tab",
  })
}

/**
 * Start experiment recording with automatic gaze tracking setup
 */
export const startRecording = async (config?: {
  eyeTrackingServerUrl?: string
}): Promise<void> => {
  await coreStartRecording()

  // Set up gaze tracking using the new adaptor system
  const { isValidWebSocketUrl } = await import("./utils")
  const { connectTrackingAdaptor } = await import("./tracking/index")
  const { websocketTrackingAdaptor, mouseTrackingAdaptor } = await import(
    "./tracking/adaptors"
  )

  if (
    config?.eyeTrackingServerUrl &&
    isValidWebSocketUrl(config?.eyeTrackingServerUrl)
  ) {
    // Use WebSocket adaptor for real eye tracking
    const eyeTracker = websocketTrackingAdaptor(config.eyeTrackingServerUrl, {
      autoReconnect: true,
      timeout: 10000,
    })
    await connectTrackingAdaptor(eyeTracker)
  } else {
    // Use mouse adaptor for simulation
    const mouseSimulator = mouseTrackingAdaptor({
      confidenceRange: [0.7, 0.9],
      saccadeSimulation: true,
      blinkSimulation: true,
    })
    await connectTrackingAdaptor(mouseSimulator)
  }
}

/**
 * Stop experiment recording
 */
export const stopRecording = async (): Promise<{
  sessionId: string
  sessionInfo: SessionInfo | null
}> => {
  // Disconnect all tracking adaptors
  const { disconnectAllTrackingAdaptors } = await import("./tracking/index")
  await disconnectAllTrackingAdaptors()

  const sessionInfo = await coreStopRecording()
  const currentSession = getCurrentSession()

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
