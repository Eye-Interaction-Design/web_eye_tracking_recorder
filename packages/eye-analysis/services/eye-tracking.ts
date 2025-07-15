import {
	addToGazeBuffer,
	clearGazeBuffer,
	emitCalibrationResult,
	emitGazeData,
	getStore,
} from "../store";
import type {
	CalibrationResult,
	EyeData,
	EyeTrackingConfig,
	GazePoint,
	WindowInfo,
} from "../types";
import {
	convertScreenToWindowCoordinatesEnhanced,
	getBrowserWindowInfo,
	getScreenInfo,
} from "../utils";
import { saveGazeData } from "./database";

interface GazeTrackingState {
	websocket: WebSocket | null;
	sessionId: string;
	config: EyeTrackingConfig;
	isTracking: boolean;
	bufferFlushInterval: number | null;
	websocketUrl: string;
}

let gazeState: GazeTrackingState = {
	websocket: null,
	sessionId: "",
	config: {
		samplingRate: 60,
		calibrationPoints: 9,
		deviceType: "eyetracker",
	},
	isTracking: false,
	bufferFlushInterval: null,
	websocketUrl: "ws://localhost:8080",
};

export const initializeEyeTracking = (
	websocketUrl: string = "ws://localhost:8080",
	config?: EyeTrackingConfig,
): Promise<void> => {
	gazeState.websocketUrl = websocketUrl;
	gazeState.config = {
		samplingRate: 60,
		calibrationPoints: 9,
		deviceType: "eyetracker",
		...config,
	};

	if (!gazeState.websocketUrl) {
		throw new Error("WebSocket URL is required for gaze tracking");
	}

	return new Promise((resolve, reject) => {
		// Construct proper WebSocket URL
		const wsUrl = gazeState.websocketUrl.endsWith("/eye_tracking")
			? gazeState.websocketUrl
			: `${gazeState.websocketUrl}/eye_tracking`;

		console.log("Connecting to WebSocket:", wsUrl);
		gazeState.websocket = new WebSocket(wsUrl);

		gazeState.websocket.onopen = () => {
			console.log("Connected to eye tracking server");
			resolve();
		};

		gazeState.websocket.onerror = (error) => {
			console.error("WebSocket error:", error);
			reject(new Error("Failed to connect to eye tracking server"));
		};

		gazeState.websocket.onmessage = async (event) => {
			try {
				const data = JSON.parse(event.data);
				await handleGazeData(data);
			} catch (error) {
				console.error("Failed to parse gaze data:", error);
			}
		};

		gazeState.websocket.onclose = () => {
			console.log("Disconnected from eye tracking server");
			gazeState.isTracking = false;
		};
	});
};

export const startTracking = async (sessionId: string): Promise<void> => {
	if (gazeState.isTracking) {
		throw new Error("Tracking is already in progress");
	}

	if (
		!gazeState.websocket ||
		gazeState.websocket.readyState !== WebSocket.OPEN
	) {
		throw new Error("WebSocket connection not established");
	}

	gazeState.sessionId = sessionId;
	gazeState.isTracking = true;

	startBufferFlush();

	// Start tracking message to server
	gazeState.websocket.send(
		JSON.stringify({
			type: "start_tracking",
			sessionId,
			config: gazeState.config,
		}),
	);
};

export const stopTracking = async (): Promise<void> => {
	if (!gazeState.isTracking) {
		return;
	}

	gazeState.isTracking = false;
	stopBufferFlush();

	// Flush remaining buffer
	const buffer = clearGazeBuffer();
	if (buffer.length > 0) {
		await flushGazeBuffer(buffer);
	}

	if (
		gazeState.websocket &&
		gazeState.websocket.readyState === WebSocket.OPEN
	) {
		gazeState.websocket.send(
			JSON.stringify({
				type: "stop_tracking",
				sessionId: gazeState.sessionId,
			}),
		);
	}
};

export const calibrate = (): Promise<CalibrationResult> => {
	if (
		!gazeState.websocket ||
		gazeState.websocket.readyState !== WebSocket.OPEN
	) {
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
					gazeState.websocket?.removeEventListener("message", messageHandler);

					const result: CalibrationResult = {
						accuracy: data.accuracy || 0,
						points: data.points || gazeState.config.calibrationPoints || 9,
						timestamp: performance.now(),
						success: data.success || false,
						errorMessage: data.errorMessage,
					};

					emitCalibrationResult(result);
					resolve(result);
				}
			} catch (error) {
				clearTimeout(timeout);
				gazeState.websocket?.removeEventListener("message", messageHandler);
				reject(error);
			}
		};

		gazeState.websocket?.addEventListener("message", messageHandler);

		// Start calibration
		gazeState.websocket?.send(
			JSON.stringify({
				type: "calibration:start",
				points: gazeState.config.calibrationPoints,
			}),
		);
	});
};

const handleGazeData = async (data: unknown): Promise<void> => {
	if (!gazeState.isTracking) {
		return;
	}

	try {
		const gazeData = await parseGazeData(data);
		if (gazeData) {
			addToGazeBuffer(gazeData);
			emitGazeData(gazeData);
		}
	} catch (error) {
		console.error("Failed to handle gaze data:", error);
	}
};

const parseGazeData = async (data: unknown): Promise<GazePoint | null> => {
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
	const windowCoords = await convertScreenToWindowCoordinatesEnhanced(
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
		leftEye: await parseEyeData(
			gazeData.leftEye as Record<string, unknown>,
			windowInfo,
		),
		rightEye: await parseEyeData(
			gazeData.rightEye as Record<string, unknown>,
			windowInfo,
		),
		browserWindow: windowInfo,
		screen: screenInfo,
	};

	return gazePoint;
};

const parseEyeData = async (
	eyeData: Record<string, unknown>,
	windowInfo: WindowInfo,
): Promise<EyeData> => {
	const screenCoords = await convertScreenToWindowCoordinatesEnhanced(
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
};

const startBufferFlush = (): void => {
	const flushInterval = 1000; // 1 second
	gazeState.bufferFlushInterval = setInterval(() => {
		const buffer = clearGazeBuffer();
		if (buffer.length > 0) {
			flushGazeBuffer(buffer);
		}
	}, flushInterval) as unknown as number;
};

const stopBufferFlush = (): void => {
	if (gazeState.bufferFlushInterval) {
		clearInterval(gazeState.bufferFlushInterval);
		gazeState.bufferFlushInterval = null;
	}
};

const flushGazeBuffer = async (buffer: GazePoint[]): Promise<void> => {
	try {
		await saveGazeData(buffer);
	} catch (error) {
		console.error("Failed to save gaze data:", error);
		// Re-add to buffer for retry
		for (const point of buffer) {
			addToGazeBuffer(point);
		}
	}
};

export const getTrackingQuality = async (): Promise<{
	averageSamplingRate: number;
	dataLossRate: number;
	averageConfidence: number;
}> => {
	// Mock implementation - in real scenario, this would analyze the collected data
	return {
		averageSamplingRate: gazeState.config.samplingRate || 60,
		dataLossRate: 0.001,
		averageConfidence: 0.91,
	};
};

export const disconnectEyeTracking = (): void => {
	stopTracking();

	if (gazeState.websocket) {
		gazeState.websocket.close();
		gazeState.websocket = null;
	}
};

export const getTrackingState = (): {
	isTracking: boolean;
	sessionId: string;
	bufferSize: number;
} => {
	const store = getStore();
	return {
		isTracking: gazeState.isTracking,
		sessionId: gazeState.sessionId,
		bufferSize: store.gazeBuffer.length,
	};
};

export const resetEyeTrackingState = (): void => {
	disconnectEyeTracking();
	gazeState = {
		websocket: null,
		sessionId: "",
		config: {
			samplingRate: 60,
			calibrationPoints: 9,
			deviceType: "eyetracker",
		},
		isTracking: false,
		bufferFlushInterval: null,
		websocketUrl: "ws://localhost:8080",
	};
};
