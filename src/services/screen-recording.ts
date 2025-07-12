import type { RecordingConfig, VideoChunk } from "../types";
import { saveVideoChunk } from "./database";

interface RecordingState {
	mediaRecorder: MediaRecorder | null;
	stream: MediaStream | null;
	sessionId: string;
	chunkIndex: number;
	config: RecordingConfig;
	isRecording: boolean;
}

let recordingState: RecordingState = {
	mediaRecorder: null,
	stream: null,
	sessionId: "",
	chunkIndex: 0,
	config: {
		captureEntireScreen: false,
		frameRate: 30,
		chunkDuration: 30,
		quality: "high",
	},
	isRecording: false,
};

export const initializeRecording = (config?: RecordingConfig): void => {
	recordingState.config = {
		captureEntireScreen: false,
		frameRate: 30,
		chunkDuration: 30,
		quality: "high",
		...config,
	};
};

export const startRecording = async (sessionId: string): Promise<void> => {
	if (recordingState.isRecording) {
		throw new Error("Recording is already in progress");
	}

	recordingState.sessionId = sessionId;
	recordingState.chunkIndex = 0;

	try {
		recordingState.stream = await captureScreen();
		setupMediaRecorder();
		recordingState.mediaRecorder?.start(
			(recordingState.config.chunkDuration || 10) * 1000,
		);
		recordingState.isRecording = true;
	} catch (error) {
		throw new Error(`Failed to start recording: ${error}`);
	}
};

export const stopRecording = async (): Promise<void> => {
	if (!recordingState.isRecording) {
		return;
	}

	recordingState.isRecording = false;

	if (
		recordingState.mediaRecorder &&
		recordingState.mediaRecorder.state === "recording"
	) {
		recordingState.mediaRecorder.stop();
	}

	if (recordingState.stream) {
		recordingState.stream.getTracks().forEach((track) => track.stop());
		recordingState.stream = null;
	}

	recordingState.mediaRecorder = null;
};

const captureScreen = async (): Promise<MediaStream> => {
	const constraints = {
		video: {
			frameRate: recordingState.config.frameRate,
			...getVideoConstraints(),
		},
		audio: false,
	};

	if (recordingState.config.captureEntireScreen) {
		return await navigator.mediaDevices.getDisplayMedia(constraints);
	} else {
		// ブラウザウィンドウのみをキャプチャ
		const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
		return stream;
	}
};

const getVideoConstraints = (): MediaTrackConstraints => {
	const baseConstraints: MediaTrackConstraints = {
		frameRate: recordingState.config.frameRate,
	};

	switch (recordingState.config.quality) {
		case "high":
			return {
				...baseConstraints,
				width: { ideal: 1920 },
				height: { ideal: 1080 },
			};
		case "medium":
			return {
				...baseConstraints,
				width: { ideal: 1280 },
				height: { ideal: 720 },
			};
		case "low":
			return {
				...baseConstraints,
				width: { ideal: 854 },
				height: { ideal: 480 },
			};
		default:
			return baseConstraints;
	}
};

const setupMediaRecorder = (): void => {
	if (!recordingState.stream) {
		throw new Error("No stream available for recording");
	}

	const options = getMediaRecorderOptions();
	recordingState.mediaRecorder = new MediaRecorder(
		recordingState.stream,
		options,
	);

	recordingState.mediaRecorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			handleDataAvailable(event.data);
		}
	};

	recordingState.mediaRecorder.onerror = (event) => {
		console.error("MediaRecorder error:", event);
	};

	recordingState.mediaRecorder.onstop = () => {
		console.log("Recording stopped");
	};
};

const getMediaRecorderOptions = (): MediaRecorderOptions => {
	const mimeTypes = [
		"video/webm;codecs=vp9",
		"video/webm;codecs=vp8",
		"video/webm",
		"video/mp4",
	];

	for (const mimeType of mimeTypes) {
		if (MediaRecorder.isTypeSupported(mimeType)) {
			return { mimeType };
		}
	}

	return {};
};

const handleDataAvailable = async (data: Blob): Promise<void> => {
	const chunk: VideoChunk = {
		id: `chunk_${recordingState.sessionId}_${recordingState.chunkIndex}`,
		sessionId: recordingState.sessionId,
		timestamp: performance.now(),
		data,
		chunkIndex: recordingState.chunkIndex,
		duration: recordingState.config.chunkDuration || 30,
	};

	try {
		await saveVideoChunk(chunk);
		recordingState.chunkIndex++;
	} catch (error) {
		console.error("Failed to save video chunk:", error);
	}
};

export const getRecordingState = (): {
	isRecording: boolean;
	currentChunkIndex: number;
	sessionId: string;
} => {
	return {
		isRecording: recordingState.isRecording,
		currentChunkIndex: recordingState.chunkIndex,
		sessionId: recordingState.sessionId,
	};
};

export const getRecordingQuality = async (): Promise<{
	averageFrameRate: number;
	frameDrops: number;
	duration: number;
}> => {
	// Mock implementation - in real scenario, this would analyze the video tracks
	return {
		averageFrameRate: recordingState.config.frameRate || 30,
		frameDrops: 0,
		duration:
			recordingState.chunkIndex * (recordingState.config.chunkDuration || 30) * 1000,
	};
};

export const checkScreenCaptureSupport = async (): Promise<boolean> => {
	return (
		"mediaDevices" in navigator && "getDisplayMedia" in navigator.mediaDevices
	);
};

export const resetRecordingState = (): void => {
	stopRecording();
	recordingState = {
		mediaRecorder: null,
		stream: null,
		sessionId: "",
		chunkIndex: 0,
		config: {
			captureEntireScreen: false,
			frameRate: 30,
			chunkDuration: 30,
			quality: "high",
		},
		isRecording: false,
	};
};