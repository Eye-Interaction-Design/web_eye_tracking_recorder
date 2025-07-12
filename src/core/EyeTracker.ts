import type {
	GazePoint,
	GazeConfig,
	CalibrationResult,
	WindowInfo,
	ScreenInfo,
	EyeData,
} from "../types";
import { ExperimentDatabase } from "./Database";
import {
	getBrowserWindowInfo,
	getScreenInfo,
	convertScreenToWindowCoordinates,
} from "../utils";

export class GazeTracker {
	private websocket: WebSocket | null = null;
	private database: ExperimentDatabase;
	private sessionId: string = "";
	private config: GazeConfig;
	private isTracking = false;
	private gazeBuffer: GazePoint[] = [];
	private bufferFlushInterval: number | null = null;
	private websocketUrl: string;

	private onGazeDataCallback?: (gazePoint: GazePoint) => void;
	private onCalibrationCallback?: (result: CalibrationResult) => void;

	constructor(
		database: ExperimentDatabase,
		websocketUrl: string = "ws://localhost:8080",
		config?: GazeConfig,
	) {
		this.database = database;
		this.websocketUrl = websocketUrl;
		this.config = {
			samplingRate: 60,
			calibrationPoints: 9,
			deviceType: "eyetracker",
			...config,
		};
	}

	async initialize(): Promise<void> {
		if (!this.websocketUrl) {
			throw new Error("WebSocket URL is required for gaze tracking");
		}

		return new Promise((resolve, reject) => {
			this.websocket = new WebSocket(`${this.websocketUrl}/eye_tracking`);

			this.websocket.onopen = () => {
				console.log("Connected to eye tracking server");
				resolve();
			};

			this.websocket.onerror = (error) => {
				console.error("WebSocket error:", error);
				reject(new Error("Failed to connect to eye tracking server"));
			};

			this.websocket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					this.handleGazeData(data);
				} catch (error) {
					console.error("Failed to parse gaze data:", error);
				}
			};

			this.websocket.onclose = () => {
				console.log("Disconnected from eye tracking server");
				this.isTracking = false;
			};
		});
	}

	async startTracking(sessionId: string): Promise<void> {
		if (this.isTracking) {
			throw new Error("Tracking is already in progress");
		}

		if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket connection not established");
		}

		this.sessionId = sessionId;
		this.isTracking = true;
		this.gazeBuffer = [];

		this.startBufferFlush();

		// Start tracking message to server
		this.websocket.send(
			JSON.stringify({
				type: "start_tracking",
				sessionId,
				config: this.config,
			}),
		);
	}

	async stopTracking(): Promise<void> {
		if (!this.isTracking) {
			return;
		}

		this.isTracking = false;
		this.stopBufferFlush();

		// Flush remaining buffer
		if (this.gazeBuffer.length > 0) {
			await this.flushGazeBuffer();
		}

		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(
				JSON.stringify({
					type: "stop_tracking",
					sessionId: this.sessionId,
				}),
			);
		}
	}

	async calibrate(): Promise<CalibrationResult> {
		if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket connection not established");
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error("Calibration timeout"));
			}, 30000); // 30 second timeout

			const messageHandler = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data);
					if (data.type === "calibration_result") {
						clearTimeout(timeout);
						this.websocket?.removeEventListener("message", messageHandler);

						const result: CalibrationResult = {
							accuracy: data.accuracy || 0,
							points: data.points || this.config.calibrationPoints || 9,
							timestamp: performance.now(),
							success: data.success || false,
							errorMessage: data.errorMessage,
						};

						if (this.onCalibrationCallback) {
							this.onCalibrationCallback(result);
						}

						resolve(result);
					}
				} catch (error) {
					clearTimeout(timeout);
					this.websocket?.removeEventListener("message", messageHandler);
					reject(error);
				}
			};

			this.websocket?.addEventListener("message", messageHandler);

			// Start calibration
			this.websocket?.send(
				JSON.stringify({
					type: "calibration:start",
					points: this.config.calibrationPoints,
				}),
			);
		});
	}

	private handleGazeData(data: unknown): void {
		if (!this.isTracking) {
			return;
		}

		try {
			const gazeData = this.parseGazeData(data);
			if (gazeData) {
				this.gazeBuffer.push(gazeData);

				if (this.onGazeDataCallback) {
					this.onGazeDataCallback(gazeData);
				}
			}
		} catch (error) {
			console.error("Failed to handle gaze data:", error);
		}
	}

	private parseGazeData(data: unknown): GazePoint | null {
		if (!data || typeof data !== "object") {
			return null;
		}

		const gazeData = data as Record<string, unknown>;

		if (
			typeof gazeData.screenX !== "number" ||
			typeof gazeData.screenY !== "number"
		) {
			return null;
		}

		const windowInfo = getBrowserWindowInfo();
		const screenInfo = getScreenInfo();
		const windowCoords = convertScreenToWindowCoordinates(
			gazeData.screenX,
			gazeData.screenY,
			windowInfo,
		);

		const gazePoint: GazePoint = {
			systemTimestamp: (gazeData.systemTimestamp as number) || Date.now(),
			browserTimestamp: performance.now(),
			screenX: gazeData.screenX,
			screenY: gazeData.screenY,
			windowX: windowCoords.windowX,
			windowY: windowCoords.windowY,
			confidence: (gazeData.confidence as number) || 0,
			leftEye: this.parseEyeData(
				gazeData.leftEye as Record<string, unknown>,
				windowInfo,
			),
			rightEye: this.parseEyeData(
				gazeData.rightEye as Record<string, unknown>,
				windowInfo,
			),
			browserWindow: windowInfo,
			screen: screenInfo,
		};

		return gazePoint;
	}

	private parseEyeData(
		eyeData: Record<string, unknown>,
		windowInfo: WindowInfo,
	): EyeData {
		const screenCoords = convertScreenToWindowCoordinates(
			(eyeData?.screenX as number) || 0,
			(eyeData?.screenY as number) || 0,
			windowInfo,
		);

		return {
			screenX: (eyeData?.screenX as number) || 0,
			screenY: (eyeData?.screenY as number) || 0,
			windowX: screenCoords.windowX,
			windowY: screenCoords.windowY,
			positionX: (eyeData?.positionX as number) || 0,
			positionY: (eyeData?.positionY as number) || 0,
			positionZ: (eyeData?.positionZ as number) || 0,
			pupilSize: (eyeData?.pupilSize as number) || 0,
		};
	}

	private startBufferFlush(): void {
		const flushInterval = 1000; // 1 second
		this.bufferFlushInterval = setInterval(() => {
			this.flushGazeBuffer();
		}, flushInterval);
	}

	private stopBufferFlush(): void {
		if (this.bufferFlushInterval) {
			clearInterval(this.bufferFlushInterval);
			this.bufferFlushInterval = null;
		}
	}

	private async flushGazeBuffer(): Promise<void> {
		if (this.gazeBuffer.length === 0) {
			return;
		}

		const bufferToFlush = [...this.gazeBuffer];
		this.gazeBuffer = [];

		try {
			await this.database.saveGazeData(bufferToFlush);
		} catch (error) {
			console.error("Failed to save gaze data:", error);
			// Re-add to buffer for retry
			this.gazeBuffer.unshift(...bufferToFlush);
		}
	}

	onGazeData(callback: (gazePoint: GazePoint) => void): void {
		this.onGazeDataCallback = callback;
	}

	onCalibration(callback: (result: CalibrationResult) => void): void {
		this.onCalibrationCallback = callback;
	}

	async getTrackingQuality(): Promise<{
		averageSamplingRate: number;
		dataLossRate: number;
		averageConfidence: number;
	}> {
		// Mock implementation - in real scenario, this would analyze the collected data
		return {
			averageSamplingRate: this.config.samplingRate || 60,
			dataLossRate: 0.001,
			averageConfidence: 0.91,
		};
	}

	disconnect(): void {
		this.stopTracking();

		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}
	}

	getTrackingState(): {
		isTracking: boolean;
		sessionId: string;
		bufferSize: number;
	} {
		return {
			isTracking: this.isTracking,
			sessionId: this.sessionId,
			bufferSize: this.gazeBuffer.length,
		};
	}
}
