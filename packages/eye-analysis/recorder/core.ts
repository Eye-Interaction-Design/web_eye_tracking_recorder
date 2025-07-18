// Core recorder logic functions (pure functions)

import { getBrowserWindowInfo, getScreenInfo } from "./browser-info"
import { transformToContentCoordinates } from "./coordinate-transform"
// SSR Detection
import { requireBrowser } from "./ssr-guard"
import { dispatch, getState } from "./state"
import {
  getSessionData,
  initializeStorage,
  saveEvent,
  saveGazeData,
  saveSession,
  saveVideoChunk,
} from "./storage"
import type {
  GazePoint,
  GazePointInput,
  RecordingConfig,
  SessionConfig,
  SessionEvent,
  SessionInfo,
  ScreenInfo,
  WindowInfo,
  WindowState,
} from "./types"

// Current MediaRecorder instance
let mediaRecorder: MediaRecorder | null = null
let recordingStream: MediaStream | null = null
let chunkIndex = 0

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Initialize the recording system
 */
export const initialize = async (): Promise<void> => {
  requireBrowser("initialize")

  try {
    await initializeStorage()
    dispatch({ type: "INITIALIZE" })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown initialization error"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Create a new recording session
 */
export const createSession = async (
  config: SessionConfig,
  recordingConfig?: RecordingConfig,
  includeMetadata?: boolean,
  options?: {
    recordingMode?: "current-tab" | /* "browser-window" | */ "full-screen"
    screenInfo?: ScreenInfo
    windowInfo?: WindowInfo
  },
): Promise<string> => {
  requireBrowser("createSession")

  const state = getState()
  if (state.status !== "initialized") {
    throw new Error("System must be initialized before creating a session")
  }

  const sessionId = config.sessionId || generateId()

  // Default recording mode is current-tab
  const recordingMode = options?.recordingMode || "current-tab"

  // Set reference information according to recording mode
  // Always save screen and window info for reference
  const recordingReference: SessionInfo["recordingReference"] = {
    screen: options?.screenInfo || getScreenInfo(),
    window: options?.windowInfo || getBrowserWindowInfo(),
  }

  const sessionInfo: SessionInfo = {
    sessionId,
    participantId: config.participantId,
    experimentType: config.experimentType,
    startTime: Date.now(),
    status: "recording",
    recordingMode,
    recordingReference,
    config: {
      frameRate: 30,
      quality: "medium",
      chunkDuration: 5,
      captureEntireScreen: false,
      ...recordingConfig,
    },
  }

  // Add metadata if requested (for experiment API)
  if (includeMetadata) {
    sessionInfo.metadata = {
      browser: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      settings: {
        screenRecording: recordingConfig || {},
      },
      environment: {
        browser: navigator.userAgent,
        screen: `${screen.width}x${screen.height}`,
        displayWidth: window.innerWidth,
        displayHeight: window.innerHeight,
        userAgent: navigator.userAgent,
      },
    }
  }

  try {
    await saveSession(sessionInfo)

    // Save session start event
    const startEvent: SessionEvent = {
      id: generateId(),
      sessionId,
      type: "session_start",
      timestamp: Date.now(),
      data: {
        participantId: config.participantId,
        experimentType: config.experimentType,
      },
    }
    await saveEvent(startEvent)

    dispatch({ type: "CREATE_SESSION", payload: sessionInfo })
    dispatch({ type: "ADD_EVENT", payload: startEvent })

    return sessionId
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create session"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Start screen recording
 */
export const startRecording = async (): Promise<void> => {
  requireBrowser("startRecording")

  const state = getState()
  if (!state.currentSession) {
    throw new Error("No active session. Create a session first.")
  }
  if (state.isRecording) {
    throw new Error("Recording is already in progress")
  }

  try {
    // Request screen capture - prefer current tab
    const constraints = {
      video: {
        frameRate: state.currentSession.config.frameRate || 30,
      },
      audio: false,
    }

    // Try to get current tab first, fallback to display media
    try {
      // Use getDisplayMedia but with preference for current tab
      const extendedConstraints = {
        ...constraints,
        // Chrome-specific hints (ignored in other browsers)
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
      } as MediaStreamConstraints // Chrome-specific properties not in standard types
      recordingStream =
        await navigator.mediaDevices.getDisplayMedia(extendedConstraints)
    } catch (_error) {
      // Fallback to standard display media
      recordingStream =
        await navigator.mediaDevices.getDisplayMedia(constraints)
    }

    // Setup MediaRecorder with format selection
    const videoFormat = state.currentSession.config.videoFormat || "webm"
    const videoCodec = state.currentSession.config.videoCodec || "vp9"

    // Determine MIME type based on format and codec
    let mimeType = "video/webm;codecs=vp9"
    if (videoFormat === "mp4") {
      mimeType = videoCodec === "h264" ? "video/mp4;codecs=avc1" : "video/mp4"
    } else if (videoFormat === "webm") {
      mimeType =
        videoCodec === "vp8" ? "video/webm;codecs=vp8" : "video/webm;codecs=vp9"
    }

    // Check if format is supported
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(`Format ${mimeType} not supported, falling back to default`)
      mimeType = "video/webm;codecs=vp9"
    }

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond:
        state.currentSession.config.quality === "high"
          ? 2500000
          : state.currentSession.config.quality === "medium"
            ? 1500000
            : 800000,
    }

    mediaRecorder = new MediaRecorder(recordingStream, options)
    chunkIndex = 0

    // Handle data available
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && state.currentSession) {
        const chunk = {
          id: generateId(),
          sessionId: state.currentSession.sessionId,
          timestamp: Date.now(),
          data: event.data,
          chunkIndex: chunkIndex++,
          duration: state.currentSession.config.chunkDuration || 5,
        }

        try {
          await saveVideoChunk(chunk)
          dispatch({
            type: "UPDATE_DURATION",
            payload: Math.floor(
              (Date.now() - state.currentSession.startTime) / 1000,
            ),
          })
        } catch (error) {
          console.error("Failed to save video chunk:", error)
        }
      }
    }

    // Handle recording stop
    mediaRecorder.onstop = () => {
      if (recordingStream) {
        recordingStream.getTracks().forEach((track) => track.stop())
        recordingStream = null
      }
    }

    // Start recording with chunks
    const chunkDuration =
      (state.currentSession.config.chunkDuration || 5) * 1000
    mediaRecorder.start(chunkDuration)

    // Save recording start event
    const recordingStartEvent: SessionEvent = {
      id: generateId(),
      sessionId: state.currentSession.sessionId,
      type: "recording_start",
      timestamp: Date.now(),
    }
    await saveEvent(recordingStartEvent)

    dispatch({ type: "START_RECORDING" })

    // Get actual content size from the recording stream
    const videoTrack = recordingStream.getVideoTracks()[0]
    if (videoTrack) {
      const settings = videoTrack.getSettings()
      const actualContentSize = {
        width: settings.width || 0,
        height: settings.height || 0,
      }

      // Update session info with actual content size
      const updatedSession = {
        ...state.currentSession,
        actualContentSize,
      }

      // Update session in storage
      await saveSession(updatedSession)

      // Update state
      dispatch({
        type: "UPDATE_SESSION",
        payload: updatedSession,
      })
    }
    dispatch({ type: "ADD_EVENT", payload: recordingStartEvent })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to start recording"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Stop screen recording
 */
export const stopRecording = async (): Promise<SessionInfo | null> => {
  requireBrowser("stopRecording")

  const state = getState()
  if (!state.isRecording || !mediaRecorder) {
    throw new Error("No recording in progress")
  }

  try {
    mediaRecorder.stop()
    mediaRecorder = null

    if (state.currentSession) {
      // Update session end time and status
      const updatedSession = {
        ...state.currentSession,
        endTime: Date.now(),
        status: "completed" as const,
      }

      // Update metadata duration if it exists
      if (updatedSession.metadata) {
        updatedSession.metadata.duration =
          updatedSession.endTime - updatedSession.startTime
      }

      await saveSession(updatedSession)

      // Save recording stop event
      const recordingStopEvent: SessionEvent = {
        id: generateId(),
        sessionId: state.currentSession.sessionId,
        type: "recording_stop",
        timestamp: Date.now(),
      }
      await saveEvent(recordingStopEvent)

      dispatch({ type: "ADD_EVENT", payload: recordingStopEvent })
      dispatch({ type: "STOP_RECORDING" })

      return updatedSession
    }

    dispatch({ type: "STOP_RECORDING" })
    return null
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to stop recording"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Add gaze data point with automatic browser/screen info collection
 */
export const addGazeData = async (
  gazeInput: GazePointInput,
  options?: {
    getWindowState?: () => WindowState
  },
): Promise<GazePoint> => {
  requireBrowser("addGazeData")

  const state = getState()
  if (!state.currentSession) {
    throw new Error("No active session. Create a session first.")
  }

  try {
    const session = state.currentSession

    // Get window state (only for current-tab/browser-window cases)
    let windowState: WindowState | undefined
    if (session.recordingMode !== "full-screen") {
      if (options?.getWindowState) {
        windowState = options.getWindowState()
      } else {
        // Get default window state
        windowState = {
          screenX: window.screenX,
          screenY: window.screenY,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          outerWidth: window.outerWidth,
          outerHeight: window.outerHeight,
        }
      }
    }

    // Get screen dimensions at time of recording
    const screenInfo = getScreenInfo()

    // Coordinate transformation (screenX/Y → contentX/Y)
    const { contentX, contentY } = transformToContentCoordinates(
      gazeInput.screenX ?? 0,
      gazeInput.screenY ?? 0,
      session,
      windowState,
      gazeInput.normalized,
      screenInfo.width,
      screenInfo.height,
    )

    // Left eye coordinate transformation (if available)
    const leftEyeContent = gazeInput.leftEye
      ? transformToContentCoordinates(
          gazeInput.leftEye.screenX ?? 0,
          gazeInput.leftEye.screenY ?? 0,
          session,
          windowState,
          gazeInput.normalized,
          screenInfo.width,
          screenInfo.height,
        )
      : undefined

    // Right eye coordinate transformation (if available)
    const rightEyeContent = gazeInput.rightEye
      ? transformToContentCoordinates(
          gazeInput.rightEye.screenX ?? 0,
          gazeInput.rightEye.screenY ?? 0,
          session,
          windowState,
          gazeInput.normalized,
          screenInfo.width,
          screenInfo.height,
        )
      : undefined

    // Create complete GazePoint with all required fields
    const completeGazePoint: GazePoint = {
      sessionId: session.sessionId,
      deviceTimeStamp: gazeInput.deviceTimeStamp,
      systemTimestamp: gazeInput.systemTimestamp ?? Date.now(),
      browserTimestamp: performance.now(),
      normalized: gazeInput.normalized,
      screenX: session.recordingMode === "full-screen" ? 0 : gazeInput.screenX,
      screenY: session.recordingMode === "full-screen" ? 0 : gazeInput.screenY,
      screenWidth: screenInfo.width,
      screenHeight: screenInfo.height,
      contentX,
      contentY,
      confidence: gazeInput.confidence,
      leftEye: gazeInput.leftEye
        ? {
            screenX:
              session.recordingMode === "full-screen"
                ? 0
                : gazeInput.leftEye.screenX,
            screenY:
              session.recordingMode === "full-screen"
                ? 0
                : gazeInput.leftEye.screenY,
            contentX: leftEyeContent?.contentX || 0,
            contentY: leftEyeContent?.contentY || 0,
            positionX: gazeInput.leftEye.positionX,
            positionY: gazeInput.leftEye.positionY,
            positionZ: gazeInput.leftEye.positionZ,
            pupilSize: gazeInput.leftEye.pupilSize,
            rotateX: gazeInput.leftEye.rotateX,
            rotateY: gazeInput.leftEye.rotateY,
            rotateZ: gazeInput.leftEye.rotateZ,
          }
        : undefined,
      rightEye: gazeInput.rightEye
        ? {
            screenX:
              session.recordingMode === "full-screen"
                ? 0
                : gazeInput.rightEye.screenX,
            screenY:
              session.recordingMode === "full-screen"
                ? 0
                : gazeInput.rightEye.screenY,
            contentX: rightEyeContent?.contentX || 0,
            contentY: rightEyeContent?.contentY || 0,
            positionX: gazeInput.rightEye.positionX,
            positionY: gazeInput.rightEye.positionY,
            positionZ: gazeInput.rightEye.positionZ,
            pupilSize: gazeInput.rightEye.pupilSize,
            rotateX: gazeInput.rightEye.rotateX,
            rotateY: gazeInput.rightEye.rotateY,
            rotateZ: gazeInput.rightEye.rotateZ,
          }
        : undefined,

      // Window state (only when necessary)
      windowState,
    }

    await saveGazeData(session.sessionId, completeGazePoint)
    dispatch({ type: "ADD_GAZE_DATA", payload: completeGazePoint })

    return completeGazePoint
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save gaze data"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Add custom event
 */
export const addEvent = async (
  type: string,
  data?: Record<string, unknown>,
): Promise<SessionEvent> => {
  requireBrowser("addEvent")

  const state = getState()
  if (!state.currentSession) {
    throw new Error("No active session. Create a session first.")
  }

  try {
    const event: SessionEvent = {
      id: generateId(),
      sessionId: state.currentSession.sessionId,
      type: "user_event",
      timestamp: Date.now(),
      data: { eventType: type, ...data },
    }

    await saveEvent(event)
    dispatch({ type: "ADD_EVENT", payload: event })

    return event
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to save event"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Export session data as ZIP
 */
export const exportSessionData = async (sessionId?: string): Promise<Blob> => {
  requireBrowser("exportSessionData")

  const state = getState()
  const targetSessionId = sessionId || state.currentSession?.sessionId

  if (!targetSessionId) {
    throw new Error("No session ID provided and no active session")
  }

  try {
    const sessionData = await getSessionData(targetSessionId)

    // For now, return JSON data as blob
    // TODO: Implement ZIP creation with video chunks
    const jsonData = {
      ...sessionData,
      videoChunks: sessionData.videoChunks.map((chunk) => ({
        ...chunk,
        // Video data will be included separately in full implementation
        data: `[Video chunk ${chunk.chunkIndex} - ${chunk.size} bytes]`,
      })),
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    })
    return blob
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to export session data"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Download session data as file (legacy single JSON export)
 */
export const downloadSessionData = async (
  sessionId?: string,
  filename?: string,
): Promise<void> => {
  requireBrowser("downloadSessionData")

  try {
    const blob = await exportSessionData(sessionId)
    const state = getState()
    const targetSessionId = sessionId || state.currentSession?.sessionId

    const defaultFilename = `session-${targetSessionId}-${new Date().toISOString().split("T")[0]}.json`
    const downloadFilename = filename || defaultFilename

    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = downloadFilename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to download session data"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Download complete session data as multiple files (JSON + CSV + Video)
 */
export const downloadCompleteSession = async (
  sessionId?: string,
): Promise<void> => {
  requireBrowser("downloadCompleteSession")

  const state = getState()
  const targetSessionId = sessionId || state.currentSession?.sessionId

  if (!targetSessionId) {
    throw new Error("No session ID provided and no active session")
  }

  try {
    const { downloadCompleteSessionData } = await import("./export")
    await downloadCompleteSessionData(targetSessionId)
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to download complete session data"
    dispatch({ type: "SET_ERROR", payload: errorMessage })
    throw error
  }
}

/**
 * Reset the system to initial state
 */
export const reset = (): void => {
  // Stop recording if active
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop()
  }

  // Clean up streams
  if (recordingStream) {
    recordingStream.getTracks().forEach((track) => track.stop())
    recordingStream = null
  }

  mediaRecorder = null
  chunkIndex = 0

  dispatch({ type: "RESET" })
}

/**
 * Get current recording state
 */
export const getCurrentState = () => getState()

/**
 * Check if currently recording
 */
export const isRecording = (): boolean => getState().isRecording

/**
 * Get current session info
 */
export const getCurrentSession = (): SessionInfo | null =>
  getState().currentSession
