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
} from "./recorder/storage";

// Browser utilities
export {
	getBrowserWindowInfo,
	getScreenInfo,
	screenToWindowCoordinates,
	windowToScreenCoordinates,
	windowToContentCoordinates,
} from "./recorder/browser-info";
