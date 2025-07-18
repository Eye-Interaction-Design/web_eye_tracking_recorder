// Tracking adaptors - main export file

// Core types and interfaces
export type * from "./types"

// Manager functions
export {
  connectTrackingAdaptor,
  disconnectTrackingAdaptor,
  disconnectAllTrackingAdaptors,
  getActiveTrackingAdaptors,
  getTrackingAdaptorStatus,
  onTrackingAdaptorStatusChange,
  onTrackingAdaptorGaze,
  handleGazeData,
  getCurrentTrackingMode,
  getTrackingQuality,
  isTrackingActive,
  getAllTrackingAdaptors,
  resetTrackingManager,
} from "./manager"

// All adaptors - re-export from adaptors directory
export * from "./adaptors"

// Re-export common types for convenience
export type {
  TrackingAdaptor,
  DataProcessingAdaptor,
  FunctionBasedAdaptor,
  TrackingStatus,
  ConnectionOptions,
  AdaptorManagerState,
  StatusChangeCallback,
  ErrorCallback,
  GazeCallback,
  AdaptorFactory,
} from "./types"
