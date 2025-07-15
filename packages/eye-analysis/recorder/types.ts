// Core types for the new simplified recorder

export interface GazePoint {
	systemTimestamp: number; // 視線追跡システムのタイムスタンプ
	browserTimestamp: number; // ブラウザのperformance.now()
	screenX: number; // 画面全体基準のピクセル座標X
	screenY: number; // 画面全体基準のピクセル座標Y
	windowX: number; // ブラウザウィンドウ内座標X（計算値）
	windowY: number; // ブラウザウィンドウ内座標Y（計算値）
	confidence: number; // 信頼度 0.0-1.0
	leftEye: EyeData;
	rightEye: EyeData;
	browserWindow: WindowInfo;
	screen: ScreenInfo;
}

// Simplified input for addGazeData - missing fields will be auto-filled
export interface GazePointInput {
	systemTimestamp?: number; // Optional - will use current time if not provided
	screenX: number; // Required
	screenY: number; // Required
	confidence: number; // Required
	leftEye: EyeDataInput; // Required
	rightEye: EyeDataInput; // Required
}

export interface EyeDataInput {
	screenX: number; // Required
	screenY: number; // Required
	positionX?: number; // Optional
	positionY?: number; // Optional
	positionZ?: number; // Optional
	pupilSize?: number; // Optional
}

export interface EyeData {
	screenX: number; // 画面全体基準のピクセル座標X
	screenY: number; // 画面全体基準のピクセル座標Y
	windowX: number; // ブラウザウィンドウ内座標X（計算値）
	windowY: number; // ブラウザウィンドウ内座標Y（計算値）
	positionX?: number; // アイトラッカーを原点とした眼球の相対座標X（mm）
	positionY?: number; // アイトラッカーを原点とした眼球の相対座標Y（mm）
	positionZ?: number; // アイトラッカーを原点とした眼球の相対座標Z（mm）
	pupilSize?: number; // 瞳孔サイズ（mm）
}

export interface SessionEvent {
	id: string;
	sessionId: string;
	type:
		| "session_start"
		| "session_stop"
		| "recording_start"
		| "recording_stop"
		| "user_event";
	timestamp: number;
	data?: Record<string, unknown>;
}

export interface SessionConfig {
	participantId: string;
	experimentType: string;
	sessionId?: string;
}

export interface RecordingConfig {
	frameRate?: number;
	quality?: "low" | "medium" | "high";
	chunkDuration?: number; // seconds
	captureEntireScreen?: boolean;
	videoFormat?: "webm" | "mp4";
	videoCodec?: "vp8" | "vp9" | "h264";
}

export interface RecorderState {
	status: "idle" | "initialized" | "recording" | "stopped" | "error";
	currentSession: SessionInfo | null;
	isRecording: boolean;
	recordingDuration: number;
	gazeDataCount: number;
	eventsCount: number;
	videoChunksCount: number;
	error: string | null;
	lastUpdate: number;
}

export interface SessionInfo {
	sessionId: string;
	participantId: string;
	experimentType: string;
	startTime: number;
	endTime?: number;
	config: RecordingConfig;
	status?: "recording" | "completed" | "error";
	metadata?: {
		browser?: string;
		screen?: string;
		displayWidth?: number;
		displayHeight?: number;
		userAgent?: string;
		duration?: number;
		settings?: {
			screenRecording?: RecordingConfig;
			eyeTracking?: EyeTrackingConfig;
		};
		environment?: {
			browser?: string;
			screen?: string;
			displayWidth?: number;
			displayHeight?: number;
			userAgent?: string;
		};
	};
}

export interface SessionData {
	session: SessionInfo;
	events: SessionEvent[];
	gazeData: GazePoint[];
	videoChunks: VideoChunkInfo[];
	metadata: {
		totalDuration: number;
		gazeDataPoints: number;
		eventsCount: number;
		chunksCount: number;
		exportedAt: string;
	};
}

export interface VideoChunkInfo {
	id: string;
	sessionId: string;
	timestamp: number;
	chunkIndex: number;
	duration: number;
	size: number;
}

export interface WindowInfo {
	innerWidth: number; // window.innerWidth
	innerHeight: number; // window.innerHeight
	scrollX: number; // window.scrollX
	scrollY: number; // window.scrollY
	devicePixelRatio: number; // window.devicePixelRatio
	screenX: number; // window.screenX（ブラウザ位置X）
	screenY: number; // window.screenY（ブラウザ位置Y）
	outerWidth: number; // window.outerWidth（ブラウザ全体幅）
	outerHeight: number; // window.outerHeight（ブラウザ全体高さ）
}

export interface ScreenInfo {
	width: number; // screen.width（画面全体幅）
	height: number; // screen.height（画面全体高さ）
	availWidth: number; // screen.availWidth（利用可能幅）
	availHeight: number; // screen.availHeight（利用可能高さ）
}

export type StateSubscriber = (state: RecorderState) => void;

// Eye tracking configuration
export interface EyeTrackingConfig {
	samplingRate?: number;
	serverUrl?: string;
	calibrationPoints?: number;
	trackingMode?: "mouse" | "webgazer" | "external";
}

// Calibration result
export interface CalibrationResult {
	success: boolean;
	accuracy?: number;
	precision?: number;
	errorMessage?: string;
	points?: Array<{
		x: number;
		y: number;
		accuracy: number;
	}>;
}

// Quality metrics
export interface QualityMetrics {
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
}

// Experiment configuration (for high-level API)
export interface ExperimentConfig {
	participantId: string;
	experimentType: string;
	sessionId?: string;
	recording?: RecordingConfig;
	eyeTracking?: EyeTrackingConfig;
	eyeTrackingServerUrl?: string;
	enableEyeTracking?: boolean;
}

export type RecorderAction =
	| { type: "INITIALIZE" }
	| { type: "CREATE_SESSION"; payload: SessionInfo }
	| { type: "START_RECORDING" }
	| { type: "STOP_RECORDING" }
	| { type: "ADD_GAZE_DATA"; payload: GazePoint }
	| { type: "ADD_EVENT"; payload: SessionEvent }
	| { type: "UPDATE_DURATION"; payload: number }
	| { type: "SET_ERROR"; payload: string }
	| { type: "CLEAR_ERROR" }
	| { type: "RESET" };
