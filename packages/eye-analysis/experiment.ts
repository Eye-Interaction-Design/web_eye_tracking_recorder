// High-level experiment API that wraps core functionality
// Integrates experiment-recorder.ts and demo-logic.ts functionality

import type {
	SessionConfig,
	RecordingConfig,
	SessionInfo,
	SessionEvent,
	GazePoint,
	GazePointInput,
	RecorderState,
	ExperimentConfig,
	CalibrationResult,
	QualityMetrics,
	EyeTrackingConfig,
} from "./recorder/types";

import {
	initialize as coreInitialize,
	createSession as coreCreateSession,
	startRecording as coreStartRecording,
	stopRecording as coreStopRecording,
	addGazeData as coreAddGazeData,
	addEvent as coreAddEvent,
	getCurrentState,
	getCurrentSession,
	isRecording,
	downloadSessionData as coreDownloadSessionData,
} from "./recorder/core";

import {
	downloadSessionComponents as coreDownloadSessionComponents,
	downloadSessionAsZip as coreDownloadSessionAsZip,
	saveExperimentData as coreSaveExperimentData,
} from "./recorder/export";

import { subscribe } from "./recorder/state";

// Callback types for experiment API
export type GazeDataCallback = (gazePoint: GazePoint) => void;
export type SessionEventCallback = (event: SessionEvent) => void;
export type CalibrationCallback = (result: CalibrationResult) => void;

// Experiment state management
interface ExperimentState {
	onGazeDataCallback?: GazeDataCallback;
	onSessionEventCallback?: SessionEventCallback;
	onCalibrationCallback?: CalibrationCallback;
	eyeTrackingServerUrl?: string;
	mouseTrackingActive: boolean;
	eyeTrackingConnected: boolean;
	mouseTrackingCleanup?: () => void;
	eyeTrackingCleanup?: () => void;
}

const experimentState: ExperimentState = {
	mouseTrackingActive: false,
	eyeTrackingConnected: false,
};

// Enhanced gaze data handler that triggers callbacks
const handleGazeData = (gazePoint: GazePoint) => {
	if (experimentState.onGazeDataCallback) {
		experimentState.onGazeDataCallback(gazePoint);
	}
};

// Enhanced event handler that triggers callbacks
const handleSessionEvent = (event: SessionEvent) => {
	if (experimentState.onSessionEventCallback) {
		experimentState.onSessionEventCallback(event);
	}
};

/**
 * Initialize the experiment system
 */
export const initializeExperiment = async (
	config?: ExperimentConfig,
): Promise<void> => {
	await coreInitialize();

	// Store eye tracking server URL if provided
	if (config?.eyeTrackingServerUrl) {
		experimentState.eyeTrackingServerUrl = config.eyeTrackingServerUrl;
	}
};

/**
 * Create a new experiment session
 */
export const createExperimentSession = async (
	config: ExperimentConfig,
): Promise<string> => {
	const sessionConfig: SessionConfig = {
		participantId: config.participantId,
		experimentType: config.experimentType,
		sessionId: config.sessionId,
	};

	const recordingConfig: RecordingConfig = {
		frameRate: 30,
		quality: "high",
		videoFormat: "webm",
		chunkDuration: 5,
		...config.recording,
	};

	// Create session with metadata
	return await coreCreateSession(sessionConfig, recordingConfig, true);
};

/**
 * Start experiment recording with automatic gaze tracking setup
 */
export const startExperiment = async (config?: {
	eyeTrackingServerUrl?: string;
}): Promise<void> => {
	await coreStartRecording();

	const serverUrl =
		config?.eyeTrackingServerUrl || experimentState.eyeTrackingServerUrl;

	// Set up gaze tracking - either real eye tracking or mouse simulation
	if (serverUrl && isValidWebSocketUrl(serverUrl)) {
		await connectToEyeTrackingServer(serverUrl);
	} else {
		startMouseTracking();
	}
};

/**
 * Stop experiment recording
 */
export const stopExperiment = async (): Promise<{
	sessionId: string;
	sessionInfo: SessionInfo | null;
}> => {
	stopMouseTracking();
	disconnectFromEyeTrackingServer();

	const sessionInfo = await coreStopRecording();
	const currentSession = getCurrentSession();

	return {
		sessionId: currentSession?.sessionId || "",
		sessionInfo,
	};
};

/**
 * Add gaze data point (enhanced with callbacks)
 */
export const addGazeData = async (gazeInput: GazePointInput): Promise<void> => {
	await coreAddGazeData(gazeInput);

	// Get the complete gaze point from state to trigger callback
	const state = getCurrentState();
	if (state.gazeDataCount > 0 && experimentState.onGazeDataCallback) {
		// Note: This is a simplified approach - in a real implementation,
		// we'd need to access the actual gaze point that was just added
		// For now, we'll trigger the callback with the input data enhanced
		const enhancedGazePoint = gazeInput as GazePoint;
		handleGazeData(enhancedGazePoint);
	}
};

/**
 * Add experiment event (enhanced with callbacks)
 */
export const addExperimentEvent = async (
	type: string,
	data?: Record<string, unknown>,
): Promise<void> => {
	await coreAddEvent(type, data);

	// Trigger callback if set
	if (experimentState.onSessionEventCallback) {
		const currentSession = getCurrentSession();
		if (currentSession) {
			const event: SessionEvent = {
				id: `event_${Date.now()}`,
				sessionId: currentSession.sessionId,
				type: "user_event",
				timestamp: Date.now(),
				data: { eventType: type, ...data },
			};
			handleSessionEvent(event);
		}
	}
};

/**
 * Set gaze data callback
 */
export const onGazeData = (callback: GazeDataCallback): void => {
	experimentState.onGazeDataCallback = callback;
};

/**
 * Set session event callback
 */
export const onSessionEvent = (callback: SessionEventCallback): void => {
	experimentState.onSessionEventCallback = callback;
};

/**
 * Set calibration callback
 */
export const onCalibration = (callback: CalibrationCallback): void => {
	experimentState.onCalibrationCallback = callback;
};

/**
 * Subscribe to experiment state changes
 */
export const subscribeToExperiment = (
	callback: (state: RecorderState) => void,
): (() => void) => {
	return subscribe(callback);
};

/**
 * Get current experiment state
 */
export const getCurrentExperimentState = (): RecorderState => {
	return getCurrentState();
};

/**
 * Get current experiment session
 */
export const getCurrentExperimentSession = (): SessionInfo | null => {
	return getCurrentSession();
};

/**
 * Check if experiment is currently recording
 */
export const isExperimentRecording = (): boolean => {
	return isRecording();
};

// Download and export functions (demo-logic.ts integration)

/**
 * Download session data as JSON
 */
export const downloadSessionJSON = async (
	sessionId?: string,
): Promise<void> => {
	const targetSessionId = sessionId || getCurrentSession()?.sessionId;
	if (!targetSessionId) throw new Error("No session available");

	await coreDownloadSessionData(targetSessionId);
};

/**
 * Download session components (JSON + CSV)
 */
export const downloadSessionComponents = async (
	sessionId?: string,
): Promise<void> => {
	const targetSessionId = sessionId || getCurrentSession()?.sessionId;
	if (!targetSessionId) throw new Error("No session available");

	await coreDownloadSessionComponents(targetSessionId, {
		includeMetadata: true,
		includeGazeData: true,
		includeEvents: true,
		includeVideo: true,
	});
};

/**
 * Download session as ZIP
 */
export const downloadSessionAsZip = async (
	sessionId?: string,
): Promise<void> => {
	const targetSessionId = sessionId || getCurrentSession()?.sessionId;
	if (!targetSessionId) throw new Error("No session available");

	await coreDownloadSessionAsZip(targetSessionId, {
		includeMetadata: true,
		includeGazeData: true,
		includeEvents: true,
		includeVideo: true,
	});
};

/**
 * Save experiment data with metadata
 */
export const saveExperimentData = async (
	experimentMetadata?: Record<string, unknown>,
	sessionId?: string,
): Promise<void> => {
	const targetSessionId = sessionId || getCurrentSession()?.sessionId;
	if (!targetSessionId) throw new Error("No session available");

	await coreSaveExperimentData(targetSessionId, {
		completedAt: new Date().toISOString(),
		...experimentMetadata,
	});
};

// Mouse tracking simulation (from demo-logic.ts)

/**
 * Start mouse tracking for gaze simulation
 */
export const startMouseTracking = (): void => {
	if (experimentState.mouseTrackingActive) return;

	experimentState.mouseTrackingActive = true;

	const handleMouseMove = (event: MouseEvent) => {
		if (!experimentState.mouseTrackingActive) return;

		// Generate simulated gaze data from mouse position
		const gazePoint: GazePointInput = {
			screenX: event.screenX,
			screenY: event.screenY,
			confidence: 0.8 + Math.random() * 0.2,
			leftEye: {
				screenX: event.screenX - 2 + Math.random() * 2,
				screenY: event.screenY + Math.random() * 2,
				pupilSize: 3 + Math.random() * 2,
			},
			rightEye: {
				screenX: event.screenX + 2 + Math.random() * 2,
				screenY: event.screenY + Math.random() * 2,
				pupilSize: 3 + Math.random() * 2,
			},
		};

		addGazeData(gazePoint).catch(console.error);
	};

	document.addEventListener("mousemove", handleMouseMove);

	experimentState.mouseTrackingCleanup = () => {
		document.removeEventListener("mousemove", handleMouseMove);
		experimentState.mouseTrackingCleanup = undefined;
	};
};

/**
 * Stop mouse tracking
 */
export const stopMouseTracking = (): void => {
	experimentState.mouseTrackingActive = false;
	if (experimentState.mouseTrackingCleanup) {
		experimentState.mouseTrackingCleanup();
	}
};

/**
 * Check if mouse tracking is active
 */
export const isMouseTrackingActive = (): boolean => {
	return experimentState.mouseTrackingActive;
};

// Eye tracking server connection (from demo-logic.ts)

/**
 * Validate WebSocket URL
 */
export const isValidWebSocketUrl = (url: string): boolean => {
	if (!url || url.trim() === "") return false;

	try {
		const urlObj = new URL(url);
		return urlObj.protocol === "ws:" || urlObj.protocol === "wss:";
	} catch {
		return false;
	}
};

/**
 * Connect to eye tracking server
 */
export const connectToEyeTrackingServer = async (
	serverUrl: string,
): Promise<void> => {
	if (experimentState.eyeTrackingConnected) {
		disconnectFromEyeTrackingServer();
	}

	return new Promise((resolve, reject) => {
		try {
			const websocket = new WebSocket(serverUrl);

			const timeout = setTimeout(() => {
				websocket.close();
				reject(new Error("Connection timeout"));
			}, 10000);

			websocket.onopen = () => {
				clearTimeout(timeout);
				experimentState.eyeTrackingConnected = true;
				experimentState.eyeTrackingServerUrl = serverUrl;
				console.log("Connected to eye tracking server:", serverUrl);
				resolve();
			};

			websocket.onerror = (error) => {
				clearTimeout(timeout);
				console.error("WebSocket error:", error);
				reject(new Error("Failed to connect to eye tracking server"));
			};

			websocket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					handleEyeTrackingData(data);
				} catch (error) {
					console.error("Failed to parse eye tracking data:", error);
				}
			};

			websocket.onclose = () => {
				experimentState.eyeTrackingConnected = false;
				console.log("Disconnected from eye tracking server");
			};

			experimentState.eyeTrackingCleanup = () => {
				websocket.close();
			};
		} catch (error) {
			reject(error);
		}
	});
};

/**
 * Disconnect from eye tracking server
 */
export const disconnectFromEyeTrackingServer = (): void => {
	if (experimentState.eyeTrackingCleanup) {
		experimentState.eyeTrackingCleanup();
		experimentState.eyeTrackingCleanup = undefined;
	}

	experimentState.eyeTrackingConnected = false;
	experimentState.eyeTrackingServerUrl = undefined;
};

/**
 * Check if eye tracking is connected
 */
export const isEyeTrackingConnected = (): boolean => {
	return experimentState.eyeTrackingConnected;
};

/**
 * Get current eye tracking server URL
 */
export const getCurrentEyeTrackingServerUrl = (): string | undefined => {
	return experimentState.eyeTrackingServerUrl;
};

/**
 * Get current tracking mode
 */
export const getTrackingMode = ():
	| "eye-tracking"
	| "mouse-simulation"
	| "idle" => {
	if (experimentState.eyeTrackingConnected) {
		return "eye-tracking";
	} else if (experimentState.mouseTrackingActive) {
		return "mouse-simulation";
	} else {
		return "idle";
	}
};

// Handle eye tracking data from server
const handleEyeTrackingData = async (data: unknown): Promise<void> => {
	if (!data || typeof data !== "object") {
		return;
	}

	const messageData = data as Record<string, unknown>;

	if (messageData.type === "gaze_data") {
		const gazePoint: GazePointInput = {
			screenX: (messageData.screenX as number) || 0,
			screenY: (messageData.screenY as number) || 0,
			confidence: (messageData.confidence as number) || 0.5,
			leftEye: {
				screenX:
					((messageData.leftEye as Record<string, unknown>)
						?.screenX as number) ||
					(messageData.screenX as number) ||
					0,
				screenY:
					((messageData.leftEye as Record<string, unknown>)
						?.screenY as number) ||
					(messageData.screenY as number) ||
					0,
				pupilSize:
					((messageData.leftEye as Record<string, unknown>)
						?.pupilSize as number) || 3,
			},
			rightEye: {
				screenX:
					((messageData.rightEye as Record<string, unknown>)
						?.screenX as number) ||
					(messageData.screenX as number) ||
					0,
				screenY:
					((messageData.rightEye as Record<string, unknown>)
						?.screenY as number) ||
					(messageData.screenY as number) ||
					0,
				pupilSize:
					((messageData.rightEye as Record<string, unknown>)
						?.pupilSize as number) || 3,
			},
		};

		try {
			await addGazeData(gazePoint);
		} catch (error) {
			console.error("Failed to add gaze data:", error);
		}
	} else if (messageData.type === "calibration_result") {
		const result = {
			success: (messageData.success as boolean) || false,
			accuracy: messageData.accuracy as number,
			precision: messageData.precision as number,
			errorMessage: messageData.errorMessage as string,
			points: messageData.points as Array<{
				x: number;
				y: number;
				accuracy: number;
			}>,
		} as CalibrationResult;
		if (experimentState.onCalibrationCallback) {
			experimentState.onCalibrationCallback(result);
		}
	}
};

// Utility functions

/**
 * Format duration in seconds to MM:SS format
 */
export const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Generate timestamp string
 */
export const generateTimestamp = (): string => {
	return new Date().toLocaleTimeString();
};

/**
 * Record task interaction event
 */
export const recordTaskInteraction = async (
	taskName: string,
	elementType: string = "button",
): Promise<void> => {
	await addExperimentEvent("task_interaction", {
		taskName,
		elementType,
		timestamp: Date.now(),
	});
};

// Export all types for convenience
export type {
	SessionConfig,
	RecordingConfig,
	SessionInfo,
	SessionEvent,
	GazePoint,
	GazePointInput,
	RecorderState,
	ExperimentConfig,
	CalibrationResult,
	QualityMetrics,
	EyeTrackingConfig,
};
