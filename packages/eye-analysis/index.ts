// Main library exports - simplified browser eye tracking and screen recording

// Export callback types
export type {
	CalibrationCallback,
	GazeDataCallback,
	SessionEventCallback,
} from "./experiment";
// High-level Experiment API (recommended for most users)
export {
	addExperimentEvent,
	addGazeData,
	connectToEyeTrackingServer,
	createExperimentSession,
	disconnectFromEyeTrackingServer,
	downloadSessionAsZip,
	downloadSessionComponents,
	// Download and export
	downloadSessionJSON,
	// Utilities
	formatDuration,
	generateTimestamp,
	getCurrentExperimentSession,
	getCurrentExperimentState,
	getCurrentEyeTrackingServerUrl,
	getTrackingMode,
	// Core experiment functions
	initializeExperiment,
	isExperimentRecording,
	isEyeTrackingConnected,
	isMouseTrackingActive,
	isValidWebSocketUrl,
	onCalibration,
	// Callbacks
	onGazeData,
	onSessionEvent,
	recordTaskInteraction,
	saveExperimentData,
	startExperiment,
	// Tracking modes
	startMouseTracking,
	stopExperiment,
	stopMouseTracking,
	// State management
	subscribeToExperiment,
} from "./experiment";
// Browser utilities
export {
	getBrowserWindowInfo,
	getScreenInfo,
	screenToWindowCoordinates,
	windowToContentCoordinates,
	windowToScreenCoordinates,
} from "./recorder/browser-info";
// Core functionality (for advanced users)
export {
	addEvent,
	addGazeData as coreAddGazeData,
	createSession,
	downloadCompleteSession,
	downloadSessionData,
	exportSessionData,
	getCurrentSession,
	getCurrentState,
	initialize,
	isRecording,
	reset,
	startRecording,
	stopRecording,
} from "./recorder/core";
// Export types for download options
export type { DownloadOptions } from "./recorder/export";
// Export utilities (for advanced users)
export {
	createMetadataJSON,
	createSessionSummaryText,
	downloadCompleteSessionData,
	downloadFile,
	downloadSessionAsZip as coreDownloadSessionAsZip,
	downloadSessionComponents as coreDownloadSessionComponents,
	eventsToCSV,
	exportExperimentDataset,
	gazeDataToCSV,
	getSessionComponents,
	saveExperimentData as coreSaveExperimentData,
} from "./recorder/export";
// SSR utilities
export {
	createSSRSafeAPI,
	getEnvironmentInfo,
	isBrowser,
	isNode,
	isSSR,
	requireBrowser,
	safeExecute,
} from "./recorder/ssr-guard";
// State management
export {
	dispatch,
	getState,
	getSubscriberCount,
	subscribe,
} from "./recorder/state";
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
} from "./recorder/storage";
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
} from "./recorder/types";

// Note: React integration is available as a separate package:
// npm install @web-eye-tracking-recorder/react
