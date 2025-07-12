import type {
	ExperimentConfig,
	ExperimentSession,
	GazePoint,
	SessionEvent,
	CalibrationResult,
} from "./types";
import { getStore, updateStore, addSessionEvent } from "./store";
import { generateSessionId } from "./utils";
import { initializeDatabase, saveSession, saveEvent, getSessionData, checkForIncompleteSessions } from "./services/database";
import { initializeSynchronization, getRelativeTimestamp, stopSynchronization, calculateSyncQuality } from "./services/synchronization";
import { initializeRecording, startRecording, stopRecording, getRecordingQuality } from "./services/screen-recording";
import { initializeEyeTracking, startTracking, stopTracking, calibrate, getTrackingQuality, disconnectEyeTracking } from "./services/eye-tracking";

export const initializeExperiment = async (
	config?: ExperimentConfig & { eyeTrackingServerUrl?: string; enableEyeTracking?: boolean },
): Promise<void> => {
	if (config) {
		validateConfig(config);
	}

	await initializeDatabase();
	
	// Only initialize eye tracking if explicitly enabled or if eyeTrackingServerUrl is provided
	if (config?.enableEyeTracking !== false && (config?.eyeTrackingServerUrl || config?.eyeTracking)) {
		await initializeEyeTracking(config?.eyeTrackingServerUrl, config?.eyeTracking);
	}
	
	initializeRecording(config?.recording);
	await checkForIncompleteSessions();
};

export const createSession = async (config: ExperimentConfig): Promise<string> => {
	const sessionId = config.sessionId || generateSessionId();

	const session: ExperimentSession = {
		sessionId,
		participantId: config.participantId,
		experimentType: config.experimentType,
		startTime: Date.now(),
		status: "recording",
		config,
		metadata: {
			browser: navigator.userAgent,
			screen: `${(typeof screen !== 'undefined' ? screen.width : 1920)}x${(typeof screen !== 'undefined' ? screen.height : 1080)}`,
			displayWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
			displayHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
			userAgent: navigator.userAgent,
			settings: {
				screenRecording: config.recording || {},
				eyeTracking: config.eyeTracking || {},
			},
			environment: {
				browser: navigator.userAgent,
				screen: `${(typeof screen !== 'undefined' ? screen.width : 1920)}x${(typeof screen !== 'undefined' ? screen.height : 1080)}`,
				displayWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
				displayHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
				userAgent: navigator.userAgent,
			},
		},
	};

	await saveSession(session);
	updateStore({ currentSession: session });

	return sessionId;
};

export const startExperiment = async (): Promise<void> => {
	const store = getStore();
	if (!store.currentSession) {
		throw new Error("No session created. Call createSession first.");
	}

	updateStore({ isRecording: true });
	initializeSynchronization(store.currentSession.sessionId);

	const startEvent: SessionEvent = {
		id: `event_${Date.now()}`,
		sessionId: store.currentSession.sessionId,
		type: "session_start",
		timestamp: getRelativeTimestamp(),
		data: { startTime: Date.now() },
	};

	await saveEvent(startEvent);
	addSessionEvent(startEvent);

	// Start screen recording
	await startRecording(store.currentSession.sessionId);

	// Start gaze tracking (only if initialized)
	try {
		await startTracking(store.currentSession.sessionId);
	} catch (error) {
		// Eye tracking not initialized or failed - continue with recording only
		console.warn('Eye tracking not available, continuing with screen recording only:', error);
	}
};

export const stopExperiment = async (): Promise<{
	sessionId: string;
	exportData: unknown;
}> => {
	const store = getStore();
	if (!store.currentSession) {
		throw new Error("No active session to stop.");
	}

	updateStore({ isRecording: false });

	// Stop recording and tracking
	await stopRecording();
	
	// Stop gaze tracking (only if initialized)
	try {
		await stopTracking();
	} catch (error) {
		// Eye tracking not initialized or failed - continue with recording only
		console.warn('Eye tracking not available during stop, continuing:', error);
	}
	stopSynchronization();

	const stopEvent: SessionEvent = {
		id: `event_${Date.now()}`,
		sessionId: store.currentSession.sessionId,
		type: "session_stop",
		timestamp: getRelativeTimestamp(),
		data: { endTime: Date.now() },
	};

	await saveEvent(stopEvent);
	addSessionEvent(stopEvent);

	store.currentSession.status = "completed";
	store.currentSession.endTime = Date.now();
	store.currentSession.metadata.duration =
		store.currentSession.endTime - store.currentSession.startTime;

	await saveSession(store.currentSession);

	const sessionData = await getSessionData(store.currentSession.sessionId);

	return {
		sessionId: store.currentSession.sessionId,
		exportData: sessionData,
	};
};

export const calibrateEyeTracking = async (): Promise<CalibrationResult> => {
	const store = getStore();
	if (!store.currentSession) {
		throw new Error("No active session for calibration.");
	}

	const calibrationStartEvent: SessionEvent = {
		id: `event_${Date.now()}`,
		sessionId: store.currentSession.sessionId,
		type: "calibration_start",
		timestamp: getRelativeTimestamp(),
	};

	await saveEvent(calibrationStartEvent);
	addSessionEvent(calibrationStartEvent);

	// Use actual gaze tracker calibration
	const result = await calibrate();

	const calibrationCompleteEvent: SessionEvent = {
		id: `event_${Date.now()}`,
		sessionId: store.currentSession.sessionId,
		type: "calibration_complete",
		timestamp: getRelativeTimestamp(),
		data: result as unknown as Record<string, unknown>,
	};

	await saveEvent(calibrationCompleteEvent);
	addSessionEvent(calibrationCompleteEvent);

	return result;
};

export const onGazeData = (callback: (gazePoint: GazePoint) => void): void => {
	updateStore({ onGazeDataCallback: callback });
};

export const onSessionEvent = (callback: (event: SessionEvent) => void): void => {
	updateStore({ onSessionEventCallback: callback });
};

export const onCalibration = (callback: (result: CalibrationResult) => void): void => {
	updateStore({ onCalibrationCallback: callback });
};

export const getCurrentSession = (): ExperimentSession | null => {
	return getStore().currentSession;
};

export const isCurrentlyRecording = (): boolean => {
	return getStore().isRecording;
};

export const getQualityMetrics = async (): Promise<{
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
		quality: "excellent" | "good" | "fair" | "poor";
	};
}> => {
	const [recordingQuality, gazeQuality, syncQuality] = await Promise.all([
		getRecordingQuality(),
		getTrackingQuality(),
		Promise.resolve(calculateSyncQuality()),
	]);

	return {
		recordingQuality,
		gazeTrackingQuality: gazeQuality,
		syncQuality,
	};
};

export const disconnect = (): void => {
	disconnectEyeTracking();
};

const validateConfig = (config: ExperimentConfig): void => {
	if (config.recording?.frameRate && config.recording.frameRate <= 0) {
		throw new Error("Frame rate must be positive");
	}

	if (
		config.eyeTracking?.samplingRate &&
		config.eyeTracking.samplingRate <= 0
	) {
		throw new Error("Sampling rate must be positive");
	}
};