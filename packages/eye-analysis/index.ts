// Main library exports - simplified browser eye tracking and screen recording

// Export callback types
export type {
  CalibrationCallback,
  GazeDataCallback,
  SessionEventCallback,
} from "./experiment"
// High-level Experiment API (recommended for most users)
export {
  addExperimentEvent,
  addGazeData,
  createSession,
  type DownloadSessionOptions,
  downloadSession,
  downloadSessionData,
  getCurrentSession,
  getCurrentState,
  initialize,
  isRecording,
  onGazeData,
  onSessionEvent,
  onStateChanged,
  recordTaskInteraction,
  startRecording,
  stopRecording,
} from "./experiment"
// Browser utilities
export {
  getBrowserWindowInfo,
  getScreenInfo,
  screenToWindowCoordinates,
  windowToContentCoordinates,
  windowToScreenCoordinates,
} from "./recorder/browser-info"
// Core functionality (for advanced users)
export {
  addEvent,
  addGazeData as coreAddGazeData,
  createSession as coreCreateSession,
  downloadCompleteSession,
  downloadSessionData as coreDownloadSessionData,
  exportSessionData,
  getCurrentSession as coreGetCurrentSession,
  getCurrentState as coreGetCurrentState,
  initialize as coreInitialize,
  isRecording as coreIsRecording,
  reset,
  startRecording as coreStartRecording,
  stopRecording as coreStopRecording,
} from "./recorder/core"
// Export types for download options
// Export utilities (for advanced users)
export {
  createMetadataJSON,
  createSessionSummaryText,
  type DownloadSessionOptions as CoreDownloadSessionOptions,
  downloadCompleteSessionData,
  downloadFile,
  downloadSession as coreDownloadSession,
  eventsToCSV,
  exportExperimentDataset,
  gazeDataToCSV,
} from "./recorder/export"
// SSR utilities
export {
  createSSRSafeAPI,
  getEnvironmentInfo,
  isBrowser,
  isNode,
  isSSR,
  requireBrowser,
  safeExecute,
} from "./recorder/ssr-guard"
// State management
export {
  dispatch,
  getState,
  getSubscriberCount,
  subscribe,
} from "./recorder/state"
// Storage (for advanced users)
export {
  autoCleanupStorage,
  cleanupOldVideoChunks,
  deleteSession,
  getAllSessions,
  getSession,
  getSessionData,
  getStorageUsage,
  getVideoChunkData,
  initializeStorage,
  resetDatabase,
  saveEvent,
  saveGazeData,
  saveSession,
  saveVideoChunk,
} from "./recorder/storage"
// Types
export type {
  CalibrationResult,
  ExperimentConfig,
  EyeData,
  EyeDataInput,
  EyeTrackingConfig,
  GazePoint,
  GazePointInput,
  QualityMetrics,
  RecorderAction,
  RecorderState,
  RecordingConfig,
  ScreenInfo,
  SessionConfig,
  SessionData,
  SessionEvent,
  SessionInfo,
  StateSubscriber,
  VideoChunkInfo,
  WindowInfo,
} from "./recorder/types"
// Tracking utilities
export {
  connectToEyeTrackingServer,
  disconnectFromEyeTrackingServer,
  getCurrentEyeTrackingServerUrl,
  getTrackingMode,
  isEyeTrackingConnected,
  isMouseTrackingActive,
  onCalibration,
  startMouseTracking,
  stopMouseTracking,
} from "./tracking"
// Utility functions
export {
  formatDuration,
  generateTimestamp,
  isValidWebSocketUrl,
} from "./utils"

// Note: React integration is available as a separate package:
// npm install @web-eye-tracking-recorder/react
