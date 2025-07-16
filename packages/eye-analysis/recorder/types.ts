// Core types for the new simplified recorder

export interface GazePoint {
  id: string
  sessionId: string
  systemTimestamp: number // Eye tracking system timestamp
  browserTimestamp: number // Browser performance.now()
  screenX: number // Screen-based pixel coordinate X
  screenY: number // Screen-based pixel coordinate Y
  contentX: number // Recording video coordinate X (calculated value)
  contentY: number // Recording video coordinate Y (calculated value)
  confidence: number // Confidence level 0.0-1.0
  leftEye: EyeData
  rightEye: EyeData

  // Only for current-tab/browser-window cases
  windowState?: WindowState
}

// Simplified input for addGazeData - missing fields will be auto-filled
export interface GazePointInput {
  systemTimestamp?: number // Optional - will use current time if not provided
  screenX: number // Required
  screenY: number // Required
  confidence: number // Required
  leftEye: EyeDataInput // Required
  rightEye: EyeDataInput // Required
}

export interface EyeDataInput {
  screenX: number // Required
  screenY: number // Required
  positionX?: number // Optional
  positionY?: number // Optional
  positionZ?: number // Optional
  pupilSize?: number // Optional
  rotateX?: number // Optional - Gaze direction angle (rad)
  rotateY?: number // Optional
  rotateZ?: number // Optional
}

export interface EyeData {
  screenX: number // Screen-based pixel coordinate X
  screenY: number // Screen-based pixel coordinate Y
  contentX: number // Recording video coordinate X (calculated value)
  contentY: number // Recording video coordinate Y (calculated value)
  positionX?: number // Eyeball relative coordinate X from eye tracker origin (mm)
  positionY?: number // Eyeball relative coordinate Y from eye tracker origin (mm)
  positionZ?: number // Eyeball relative coordinate Z from eye tracker origin (mm)
  pupilSize?: number // Pupil size (mm)
  rotateX?: number // Gaze direction angle (rad) with front as (0,0,0)
  rotateY?: number
  rotateZ?: number
}

export interface SessionEvent {
  id: string
  sessionId: string
  type:
    | "session_start"
    | "session_stop"
    | "recording_start"
    | "recording_stop"
    | "user_event"
  timestamp: number
  data?: Record<string, unknown>
}

export interface SessionConfig {
  participantId: string
  experimentType: string
  sessionId?: string
}

export interface RecordingConfig {
  frameRate?: number
  quality?: "low" | "medium" | "high"
  chunkDuration?: number // seconds
  captureEntireScreen?: boolean
  videoFormat?: "webm" | "mp4"
  videoCodec?: "vp8" | "vp9" | "h264"
}

export interface RecorderState {
  status: "idle" | "initialized" | "recording" | "stopped" | "error"
  currentSession: SessionInfo | null
  isRecording: boolean
  recordingDuration: number
  gazeDataCount: number
  eventsCount: number
  videoChunksCount: number
  error: string | null
  lastUpdate: number
}

export interface SessionInfo {
  sessionId: string
  participantId: string
  experimentType: string
  startTime: number
  endTime?: number
  config: RecordingConfig
  status?: "recording" | "completed" | "error"

  // Recording mode (fixed for entire session)
  recordingMode: "current-tab" | "browser-window" | "full-screen"

  // Reference information according to recording mode (undefined for full-screen)
  recordingReference?: {
    screen: ScreenInfo
    window: WindowInfo
  }

  metadata?: {
    browser?: string
    screen?: string
    displayWidth?: number
    displayHeight?: number
    userAgent?: string
    duration?: number
    settings?: {
      screenRecording?: RecordingConfig
      eyeTracking?: EyeTrackingConfig
    }
    environment?: {
      browser?: string
      screen?: string
      displayWidth?: number
      displayHeight?: number
      userAgent?: string
    }
  }
}

export interface SessionData {
  session: SessionInfo
  events: SessionEvent[]
  gazeData: GazePoint[]
  videoChunks: VideoChunkInfo[]
  metadata: {
    totalDuration: number
    gazeDataPoints: number
    eventsCount: number
    chunksCount: number
    exportedAt: string
  }
}

export interface VideoChunkInfo {
  id: string
  sessionId: string
  timestamp: number
  chunkIndex: number
  duration: number
  size: number
}

export interface WindowInfo {
  innerWidth: number // window.innerWidth
  innerHeight: number // window.innerHeight
  scrollX: number // window.scrollX
  scrollY: number // window.scrollY
  devicePixelRatio: number // window.devicePixelRatio
  screenX: number // window.screenX (browser position X)
  screenY: number // window.screenY (browser position Y)
  outerWidth: number // window.outerWidth (browser total width)
  outerHeight: number // window.outerHeight (browser total height)
}

export interface ScreenInfo {
  width: number // screen.width (total screen width)
  height: number // screen.height (total screen height)
  availWidth: number // screen.availWidth (available width)
  availHeight: number // screen.availHeight (available height)
}

// Window state (recorded as time series data due to dynamic changes)
export interface WindowState {
  screenX: number
  screenY: number
  scrollX: number
  scrollY: number
  innerWidth: number
  innerHeight: number
}

export type StateSubscriber = (state: RecorderState) => void

// Eye tracking configuration
export interface EyeTrackingConfig {
  samplingRate?: number
  serverUrl?: string
  calibrationPoints?: number
  trackingMode?: "mouse" | "webgazer" | "external"
}

// Calibration result
export interface CalibrationResult {
  success: boolean
  accuracy?: number
  precision?: number
  errorMessage?: string
  points?: Array<{
    x: number
    y: number
    accuracy: number
  }>
}

// Quality metrics
export interface QualityMetrics {
  recordingQuality: {
    averageFrameRate: number
    frameDrops: number
    duration: number
  }
  gazeTrackingQuality: {
    averageSamplingRate: number
    dataLossRate: number
    averageConfidence: number
  }
  syncQuality: {
    maxTimeOffset: number
    averageOffset: number
    quality: "excellent" | "good" | "fair" | "poor"
  }
}

// Experiment configuration (for high-level API)
export interface ExperimentConfig {
  participantId: string
  experimentType: string
  sessionId?: string
  recording?: RecordingConfig
  eyeTracking?: EyeTrackingConfig
  eyeTrackingServerUrl?: string
  enableEyeTracking?: boolean
}

// Metadata JSON structure for export
export interface MetadataJSON {
  sessionInfo: SessionInfo
  metadata: {
    totalDuration: number
    gazeDataPoints: number
    eventsCount: number
    chunksCount: number
    exportedAt: string
  }
  videoChunks: Array<VideoChunkInfo & { note: string }>
  summary: {
    totalGazePoints: number
    totalEvents: number
    totalVideoChunks: number
    sessionDuration: number
    recordingStartTime: string
    recordingEndTime: string | null
  }
}

export type RecorderAction =
  | { type: "INITIALIZE" }
  | { type: "CREATE_SESSION"; payload: SessionInfo }
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "ADD_GAZE_DATA"; payload: GazePoint }
  | { type: "ADD_EVENT"; payload: SessionEvent }
  | { type: "UPDATE_DURATION"; payload: number }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
