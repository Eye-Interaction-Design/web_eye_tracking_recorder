// Main library exports - simplified browser eye tracking and screen recording

// Core functionality
export {
	initialize,
	createSession,
	startRecording,
	stopRecording,
	addGazeData,
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
} from "./recorder/types";

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

// Export utilities
export {
	gazeDataToCSV,
	eventsToCSV,
	createMetadataJSON,
	downloadFile,
	downloadCompleteSessionData,
	createSessionSummaryText,
	getSessionComponents,
	downloadSessionComponents,
	downloadSessionAsZip,
	saveExperimentData,
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
