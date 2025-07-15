// Main library exports - simplified browser eye tracking and screen recording

// High-level Experiment API (recommended for most users)
export {
	// Core experiment functions
	initializeExperiment,
	createExperimentSession,
	startExperiment,
	stopExperiment,
	addGazeData,
	addExperimentEvent,
	// Callbacks
	onGazeData,
	onSessionEvent,
	onCalibration,
	// State management
	subscribeToExperiment,
	getCurrentExperimentState,
	getCurrentExperimentSession,
	isExperimentRecording,
	// Download and export
	downloadSessionJSON,
	downloadSessionComponents,
	downloadSessionAsZip,
	saveExperimentData,
	// Tracking modes
	startMouseTracking,
	stopMouseTracking,
	isMouseTrackingActive,
	connectToEyeTrackingServer,
	disconnectFromEyeTrackingServer,
	isEyeTrackingConnected,
	getCurrentEyeTrackingServerUrl,
	getTrackingMode,
	isValidWebSocketUrl,
	// Utilities
	formatDuration,
	generateTimestamp,
	recordTaskInteraction,
} from "./experiment";

// Core functionality (for advanced users)
export {
	initialize,
	createSession,
	startRecording,
	stopRecording,
	addGazeData as coreAddGazeData,
	addEvent,
	exportSessionData,
	downloadSessionData,
	downloadCompleteSession,
	reset,
	getCurrentState,
	isRecording,
	getCurrentSession,
} from "./recorder/core";

// State management
export {
	getState,
	dispatch,
	subscribe,
	getSubscriberCount,
} from "./recorder/state";

// Types
export type {
	GazePoint,
	GazePointInput,
	EyeData,
	EyeDataInput,
	WindowInfo,
	ScreenInfo,
	SessionEvent,
	SessionConfig,
	RecordingConfig,
	RecorderState,
	SessionInfo,
	SessionData,
	VideoChunkInfo,
	StateSubscriber,
	RecorderAction,
	ExperimentConfig,
	EyeTrackingConfig,
	CalibrationResult,
	QualityMetrics,
} from "./recorder/types";

// Export callback types
export type {
	GazeDataCallback,
	SessionEventCallback,
	CalibrationCallback,
} from "./experiment";

// Storage (for advanced users)
export {
	initializeStorage,
	resetDatabase,
	saveSession,
	getSession,
	saveEvent,
	saveGazeData,
	saveVideoChunk,
	getSessionData,
	getVideoChunkData,
	getStorageUsage,
	cleanupOldVideoChunks,
	autoCleanupStorage,
	getAllSessions,
	deleteSession,
} from "./recorder/storage";

// Export utilities (for advanced users)
export {
	gazeDataToCSV,
	eventsToCSV,
	createMetadataJSON,
	downloadFile,
	downloadCompleteSessionData,
	createSessionSummaryText,
	getSessionComponents,
	downloadSessionComponents as coreDownloadSessionComponents,
	downloadSessionAsZip as coreDownloadSessionAsZip,
	saveExperimentData as coreSaveExperimentData,
	exportExperimentDataset,
} from "./recorder/export";

// SSR utilities
export {
	isBrowser,
	isNode,
	isSSR,
	requireBrowser,
	safeExecute,
	createSSRSafeAPI,
	getEnvironmentInfo,
} from "./recorder/ssr-guard";

// Export types for download options
export type { DownloadOptions } from "./recorder/export";

// Browser utilities
export {
	getBrowserWindowInfo,
	getScreenInfo,
	screenToWindowCoordinates,
	windowToScreenCoordinates,
	windowToContentCoordinates,
} from "./recorder/browser-info";

// Note: React integration is available as a separate package:
// npm install @web-eye-tracking-recorder/react
