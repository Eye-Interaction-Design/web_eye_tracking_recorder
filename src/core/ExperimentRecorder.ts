import type {
	ExperimentConfig,
	ExperimentSession,
	GazePoint,
	SessionEvent,
	CalibrationResult,
} from "../types";
import { ExperimentDatabase } from "./Database";
import { SyncSystem } from "./SyncSystem";
import { ScreenRecorder } from "./ScreenRecorder";
import { GazeTracker } from "./GazeTracker";
import { generateSessionId } from "../utils";

export class ExperimentRecorder {
	private database: ExperimentDatabase;
	private syncSystem: SyncSystem;
	private screenRecorder: ScreenRecorder;
	private gazeTracker: GazeTracker;
	private currentSession: ExperimentSession | null = null;
	private isRecording = false;

	private onGazeDataCallback?: (gazePoint: GazePoint) => void;
	private onSessionEventCallback?: (event: SessionEvent) => void;

	constructor(config?: ExperimentConfig & { eyeTrackingServerUrl?: string }) {
		this.database = new ExperimentDatabase();
		this.syncSystem = new SyncSystem();
		this.screenRecorder = new ScreenRecorder(this.database, config?.recording);
		this.gazeTracker = new GazeTracker(
			this.database,
			config?.eyeTrackingServerUrl || "ws://localhost:8080",
			config?.gazeTracking,
		);

		this.setupGazeTrackerCallbacks();

		if (config) {
			this.validateConfig(config);
		}
	}

	async initialize(): Promise<void> {
		await this.database.initialize();
		await this.gazeTracker.initialize();
		await this.checkForIncompleteSessions();
	}

	async createSession(config: ExperimentConfig): Promise<string> {
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
				screen: `${globalThis.screen?.width || 1920}x${globalThis.screen?.height || 1080}`,
				displayWidth: globalThis.window?.innerWidth || 1920,
				displayHeight: globalThis.window?.innerHeight || 1080,
				userAgent: navigator.userAgent,
				settings: {
					screenRecording: config.recording || {},
					gazeTracking: config.gazeTracking || {},
				},
				environment: {
					browser: navigator.userAgent,
					screen: `${globalThis.screen?.width || 1920}x${globalThis.screen?.height || 1080}`,
					displayWidth: globalThis.window?.innerWidth || 1920,
					displayHeight: globalThis.window?.innerHeight || 1080,
					userAgent: navigator.userAgent,
				},
			},
		};

		await this.database.saveSession(session);
		this.currentSession = session;

		return sessionId;
	}

	async startExperiment(): Promise<void> {
		if (!this.currentSession) {
			throw new Error("No session created. Call createSession first.");
		}

		this.isRecording = true;
		this.syncSystem.initializeSync(this.currentSession.sessionId);

		const startEvent: SessionEvent = {
			id: `event_${Date.now()}`,
			sessionId: this.currentSession.sessionId,
			type: "session_start",
			timestamp: this.syncSystem.getRelativeTimestamp(),
			data: { startTime: Date.now() },
		};

		await this.database.saveEvent(startEvent);

		// Start screen recording
		await this.screenRecorder.startRecording(this.currentSession.sessionId);

		// Start gaze tracking
		await this.gazeTracker.startTracking(this.currentSession.sessionId);

		this.emitSessionEvent(startEvent);
	}

	async stopExperiment(): Promise<{
		sessionId: string;
		exportData: unknown;
	}> {
		if (!this.currentSession) {
			throw new Error("No active session to stop.");
		}

		this.isRecording = false;

		// Stop recording and tracking
		await this.screenRecorder.stopRecording();
		await this.gazeTracker.stopTracking();
		this.syncSystem.stopSync();

		const stopEvent: SessionEvent = {
			id: `event_${Date.now()}`,
			sessionId: this.currentSession.sessionId,
			type: "session_stop",
			timestamp: this.syncSystem.getRelativeTimestamp(),
			data: { endTime: Date.now() },
		};

		await this.database.saveEvent(stopEvent);

		this.currentSession.status = "completed";
		this.currentSession.endTime = Date.now();
		this.currentSession.metadata.duration =
			this.currentSession.endTime - this.currentSession.startTime;

		await this.database.saveSession(this.currentSession);

		const sessionData = await this.database.getSessionData(
			this.currentSession.sessionId,
		);

		this.emitSessionEvent(stopEvent);

		return {
			sessionId: this.currentSession.sessionId,
			exportData: sessionData,
		};
	}

	onGazeData(callback: (gazePoint: GazePoint) => void): void {
		this.onGazeDataCallback = callback;
	}

	onSessionEvent(callback: (event: SessionEvent) => void): void {
		this.onSessionEventCallback = callback;
	}

	async calibrate(): Promise<CalibrationResult> {
		if (!this.currentSession) {
			throw new Error("No active session for calibration.");
		}

		const calibrationStartEvent: SessionEvent = {
			id: `event_${Date.now()}`,
			sessionId: this.currentSession.sessionId,
			type: "calibration_start",
			timestamp: this.syncSystem.getRelativeTimestamp(),
		};

		await this.database.saveEvent(calibrationStartEvent);
		this.emitSessionEvent(calibrationStartEvent);

		// Use actual gaze tracker calibration
		const result = await this.gazeTracker.calibrate();

		const calibrationCompleteEvent: SessionEvent = {
			id: `event_${Date.now()}`,
			sessionId: this.currentSession.sessionId,
			type: "calibration_complete",
			timestamp: this.syncSystem.getRelativeTimestamp(),
			data: result as unknown as Record<string, unknown>,
		};

		await this.database.saveEvent(calibrationCompleteEvent);
		this.emitSessionEvent(calibrationCompleteEvent);

		return result;
	}

	private validateConfig(config: ExperimentConfig): void {
		if (config.recording?.frameRate && config.recording.frameRate <= 0) {
			throw new Error("Frame rate must be positive");
		}

		if (
			config.gazeTracking?.samplingRate &&
			config.gazeTracking.samplingRate <= 0
		) {
			throw new Error("Sampling rate must be positive");
		}
	}

	private async checkForIncompleteSessions(): Promise<void> {
		const incompleteSessions = await this.database.checkForIncompleteSessions();

		if (incompleteSessions.length > 0) {
			console.warn(`Found ${incompleteSessions.length} incomplete sessions`);
		}
	}

	private emitSessionEvent(event: SessionEvent): void {
		if (this.onSessionEventCallback) {
			this.onSessionEventCallback(event);
		}
	}

	private setupGazeTrackerCallbacks(): void {
		this.gazeTracker.onGazeData((gazePoint: GazePoint) => {
			this.emitGazeData(gazePoint);
		});
	}

	private emitGazeData(gazePoint: GazePoint): void {
		if (this.onGazeDataCallback) {
			this.onGazeDataCallback(gazePoint);
		}
	}

	getCurrentSession(): ExperimentSession | null {
		return this.currentSession;
	}

	isCurrentlyRecording(): boolean {
		return this.isRecording;
	}

	async getQualityMetrics(): Promise<{
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
	}> {
		const [recordingQuality, gazeQuality, syncQuality] = await Promise.all([
			this.screenRecorder.getRecordingQuality(),
			this.gazeTracker.getTrackingQuality(),
			Promise.resolve(this.syncSystem.calculateSyncQuality()),
		]);

		return {
			recordingQuality,
			gazeTrackingQuality: gazeQuality,
			syncQuality,
		};
	}

	disconnect(): void {
		this.gazeTracker.disconnect();
	}
}
