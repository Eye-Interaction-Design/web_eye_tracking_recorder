export interface GazePoint {
  systemTimestamp: number;
  browserTimestamp: number;
  screenX: number;
  screenY: number;
  windowX?: number;
  windowY?: number;
  confidence: number;
  leftEye: EyeData;
  rightEye: EyeData;
  browserWindow: WindowInfo;
  screen: ScreenInfo;
}

export interface EyeData {
  screenX: number;
  screenY: number;
  windowX?: number;
  windowY?: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  pupilSize: number;
}

export interface WindowInfo {
  innerWidth: number;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
  screenX: number;
  screenY: number;
  outerWidth: number;
  outerHeight: number;
}

export interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
}

export interface ExperimentConfig {
  sessionId?: string;
  participantId?: string;
  experimentType?: string;
  recording?: RecordingConfig;
  gazeTracking?: GazeConfig;
}

export interface RecordingConfig {
  captureEntireScreen?: boolean;
  frameRate?: number;
  chunkDuration?: number;
  quality?: 'high' | 'medium' | 'low';
}

export interface GazeConfig {
  samplingRate?: number;
  calibrationPoints?: number;
  deviceType?: 'webcam' | 'eyetracker';
}

export interface ExperimentSession {
  sessionId: string;
  participantId?: string;
  experimentType?: string;
  startTime: number;
  endTime?: number;
  status: 'recording' | 'stopped' | 'completed';
  config: ExperimentConfig;
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  browser: string;
  screen: string;
  displayWidth: number;
  displayHeight: number;
  userAgent: string;
  duration?: number;
  settings: {
    screenRecording: RecordingConfig;
    gazeTracking: GazeConfig;
  };
  environment: {
    browser: string;
    screen: string;
    displayWidth: number;
    displayHeight: number;
    userAgent: string;
  };
}

export interface VideoChunk {
  id: string;
  sessionId: string;
  timestamp: number;
  data: Blob;
  chunkIndex: number;
  duration: number;
}

export interface SyncMarker {
  id: string;
  sessionId: string;
  type: string;
  timestamp: number;
  systemTimestamp: number;
  browserTimestamp: number;
  data?: any;
}

export interface SessionEvent {
  id: string;
  sessionId: string;
  type: EventType;
  timestamp: number;
  data?: any;
}

export type EventType = 
  | 'session_start'
  | 'session_stop'
  | 'calibration_start'
  | 'calibration_complete'
  | 'sync_marker'
  | 'recording_start'
  | 'recording_stop'
  | 'error'
  | 'warning';

export interface QualityMetrics {
  sessionId: string;
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  metrics: {
    recordingQuality: {
      averageFrameRate: number;
      frameDrops: number;
      duration: number;
    };
    gazeTrackingQuality: {
      averageSamplingRate: number;
      dataLossRate: number;
      averageConfidence: number;
    };
    syncQuality: {
      maxTimeOffset: number;
      averageOffset: number;
    };
  };
}

export interface CalibrationResult {
  accuracy: number;
  points: number;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}