import type { RecordingConfig, VideoChunk } from "../types";
import { ExperimentDatabase } from "./Database";

export class ScreenRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private database: ExperimentDatabase;
	private sessionId: string = "";
	private chunkIndex = 0;
	private config: RecordingConfig;
	private isRecording = false;

	constructor(database: ExperimentDatabase, config?: RecordingConfig) {
		this.database = database;
		this.config = {
			captureEntireScreen: false,
			frameRate: 30,
			chunkDuration: 30,
			quality: "high",
			...config,
		};
	}

	async startRecording(sessionId: string): Promise<void> {
		if (this.isRecording) {
			throw new Error("Recording is already in progress");
		}

		this.sessionId = sessionId;
		this.chunkIndex = 0;

		try {
			this.stream = await this.captureScreen();
			this.setupMediaRecorder();
			this.mediaRecorder?.start(this.config.chunkDuration * 1000);
			this.isRecording = true;
		} catch (error) {
			throw new Error(`Failed to start recording: ${error}`);
		}
	}

	async stopRecording(): Promise<void> {
		if (!this.isRecording) {
			return;
		}

		this.isRecording = false;

		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			this.mediaRecorder.stop();
		}

		if (this.stream) {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = null;
		}

		this.mediaRecorder = null;
	}

	private async captureScreen(): Promise<MediaStream> {
		const constraints: DisplayMediaStreamConstraints = {
			video: {
				frameRate: this.config.frameRate,
				...this.getVideoConstraints(),
			},
			audio: false,
		};

		if (this.config.captureEntireScreen) {
			return await navigator.mediaDevices.getDisplayMedia(constraints);
		} else {
			// ブラウザウィンドウのみをキャプチャ
			const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
			return stream;
		}
	}

	private getVideoConstraints(): MediaTrackConstraints {
		const baseConstraints: MediaTrackConstraints = {
			frameRate: this.config.frameRate,
		};

		switch (this.config.quality) {
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
	}

	private setupMediaRecorder(): void {
		if (!this.stream) {
			throw new Error("No stream available for recording");
		}

		const options = this.getMediaRecorderOptions();
		this.mediaRecorder = new MediaRecorder(this.stream, options);

		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				this.handleDataAvailable(event.data);
			}
		};

		this.mediaRecorder.onerror = (event) => {
			console.error("MediaRecorder error:", event);
		};

		this.mediaRecorder.onstop = () => {
			console.log("Recording stopped");
		};
	}

	private getMediaRecorderOptions(): MediaRecorderOptions {
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
	}

	private async handleDataAvailable(data: Blob): Promise<void> {
		const chunk: VideoChunk = {
			id: `chunk_${this.sessionId}_${this.chunkIndex}`,
			sessionId: this.sessionId,
			timestamp: performance.now(),
			data,
			chunkIndex: this.chunkIndex,
			duration: this.config.chunkDuration || 30,
		};

		try {
			await this.database.saveVideoChunk(chunk);
			this.chunkIndex++;
		} catch (error) {
			console.error("Failed to save video chunk:", error);
		}
	}

	getRecordingState(): {
		isRecording: boolean;
		currentChunkIndex: number;
		sessionId: string;
	} {
		return {
			isRecording: this.isRecording,
			currentChunkIndex: this.chunkIndex,
			sessionId: this.sessionId,
		};
	}

	async getRecordingQuality(): Promise<{
		averageFrameRate: number;
		frameDrops: number;
		duration: number;
	}> {
		// Mock implementation - in real scenario, this would analyze the video tracks
		return {
			averageFrameRate: this.config.frameRate || 30,
			frameDrops: 0,
			duration: this.chunkIndex * (this.config.chunkDuration || 30) * 1000,
		};
	}

	static async checkScreenCaptureSupport(): Promise<boolean> {
		return (
			"mediaDevices" in navigator && "getDisplayMedia" in navigator.mediaDevices
		);
	}
}
