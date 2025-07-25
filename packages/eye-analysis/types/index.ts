export interface GazePoint {
  sessionId: string
  deviceTimeStamp?: number
  systemTimestamp: number
  browserTimestamp: number
  normalized?: boolean
  screenX: number | undefined
  screenY: number | undefined
  screenWidth: number
  screenHeight: number
  contentX: number
  contentY: number
  confidence: number | undefined
  leftEye?: EyeData
  rightEye?: EyeData
  windowState?: WindowState
}

export interface EyeData {
  screenX?: number
  screenY?: number
  contentX?: number
  contentY?: number
  positionX?: number
  positionY?: number
  positionZ?: number
  pupilSize?: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
}

export interface WindowInfo {
  innerWidth: number
  innerHeight: number
  scrollX: number
  scrollY: number
  devicePixelRatio: number
  screenX: number
  screenY: number
  outerWidth: number
  outerHeight: number
}

export interface WindowState {
  screenX: number
  screenY: number
  scrollX: number
  scrollY: number
  innerWidth: number
  innerHeight: number
  outerWidth: number
  outerHeight: number
}

export interface ScreenInfo {
  width: number
  height: number
  availWidth: number
  availHeight: number
}

export interface ExperimentConfig {
  sessionId?: string
  participantId?: string
  experimentType?: string
  recording?: RecordingConfig
  eyeTracking?: EyeTrackingConfig
}

export interface RecordingConfig {
  captureEntireScreen?: boolean
  frameRate?: number
  chunkDuration?: number
  quality?: "high" | "medium" | "low"
}

export interface EyeTrackingConfig {
  samplingRate?: number
  calibrationPoints?: number
  deviceType?: "webcam" | "eyetracker"
}

export interface ExperimentSession {
  sessionId: string
  participantId?: string
  experimentType?: string
  startTime: number
  endTime?: number
  status: "recording" | "stopped" | "completed"
  config: ExperimentConfig
  metadata: SessionMetadata
}

export interface SessionMetadata {
  browser: string
  screen: string
  displayWidth: number
  displayHeight: number
  userAgent: string
  duration?: number
  settings: {
    screenRecording: RecordingConfig
    eyeTracking: EyeTrackingConfig
  }
  environment: {
    browser: string
    screen: string
    displayWidth: number
    displayHeight: number
    userAgent: string
  }
}

export interface VideoChunk {
  id: string
  sessionId: string
  timestamp: number
  data: Blob
  chunkIndex: number
  duration: number
}

export interface SyncMarker {
  id: string
  sessionId: string
  type: string
  timestamp: number
  systemTimestamp: number
  browserTimestamp: number
  data?: Record<string, unknown>
}

export interface SessionEvent {
  id: string
  sessionId: string
  type: EventType
  timestamp: number
  browserTimestamp: number // performance.now() when event occurred
  data?: Record<string, unknown>
}

export type EventType =
  | "session_start"
  | "session_stop"
  | "calibration_start"
  | "calibration_complete"
  | "sync_marker"
  | "recording_start"
  | "recording_stop"
  | "error"
  | "warning"

export interface QualityMetrics {
  sessionId: string
  overallQuality: "excellent" | "good" | "fair" | "poor"
  issues: string[]
  metrics: {
    recordingQuality: {
      averageFrameRate: number
      frameDrops: number
      duration: number
    }
    eyeTrackingQuality: {
      averageSamplingRate: number
      dataLossRate: number
      averageConfidence: number
    }
    syncQuality: {
      maxTimeOffset: number
      averageOffset: number
    }
  }
}

export interface CalibrationResult {
  accuracy: number
  points: number
  timestamp: number
  success: boolean
  errorMessage?: string
}
