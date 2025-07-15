import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecorderState, useRecording, useGazeTracking } from "../hooks";
import * as eyeAnalysis from "eye-analysis";

// Mock eye-analysis module
vi.mock("eye-analysis");

describe("React Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("useRecorderState", () => {
		it("should return current state", () => {
			const mockState = {
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			};

			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue(mockState);
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useRecorderState());

			expect(result.current).toEqual(mockState);
			expect(eyeAnalysis.getCurrentState).toHaveBeenCalled();
			expect(eyeAnalysis.subscribe).toHaveBeenCalled();
		});
	});

	describe("useRecording", () => {
		it("should initialize recorder", async () => {
			vi.mocked(eyeAnalysis.initialize).mockResolvedValue(undefined);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useRecording());

			await act(async () => {
				await result.current.initialize();
			});

			expect(eyeAnalysis.initialize).toHaveBeenCalled();
			expect(result.current.isInitialized).toBe(true);
		});

		it("should create session", async () => {
			const mockSessionId = "test-session-123";
			vi.mocked(eyeAnalysis.createSession).mockResolvedValue(mockSessionId);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useRecording());

			const sessionConfig = {
				participantId: "test-participant",
				experimentType: "test-experiment",
			};

			let sessionId: string = "";
			await act(async () => {
				sessionId = await result.current.createSession(sessionConfig);
			});

			expect(eyeAnalysis.createSession).toHaveBeenCalledWith(
				sessionConfig,
				undefined,
			);
			expect(sessionId).toBe(mockSessionId);
		});

		it("should start recording", async () => {
			vi.mocked(eyeAnalysis.startRecording).mockResolvedValue(undefined);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useRecording());

			await act(async () => {
				await result.current.startRecording();
			});

			expect(eyeAnalysis.startRecording).toHaveBeenCalled();
		});

		it("should stop recording", async () => {
			vi.mocked(eyeAnalysis.stopRecording).mockResolvedValue(null);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useRecording());

			await act(async () => {
				await result.current.stopRecording();
			});

			expect(eyeAnalysis.stopRecording).toHaveBeenCalled();
		});
	});

	describe("useGazeTracking", () => {
		it("should add gaze data", async () => {
			vi.mocked(eyeAnalysis.addGazeData).mockResolvedValue(undefined);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 1,
				eventsCount: 0,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useGazeTracking());

			const gazePoint = {
				screenX: 100,
				screenY: 200,
				confidence: 0.9,
				leftEye: { screenX: 98, screenY: 200 },
				rightEye: { screenX: 102, screenY: 200 },
			};

			await act(async () => {
				await result.current.addGazeData(gazePoint);
			});

			expect(eyeAnalysis.addGazeData).toHaveBeenCalledWith(gazePoint);
			expect(result.current.gazeDataCount).toBe(1);
		});

		it("should add user event", async () => {
			vi.mocked(eyeAnalysis.addEvent).mockResolvedValue(undefined);
			vi.mocked(eyeAnalysis.getCurrentState).mockReturnValue({
				status: "idle" as const,
				isRecording: false,
				currentSession: null,
				recordingDuration: 0,
				gazeDataCount: 0,
				eventsCount: 1,
				videoChunksCount: 0,
				error: null,
				lastUpdate: Date.now(),
			});
			vi.mocked(eyeAnalysis.subscribe).mockReturnValue(() => {});

			const { result } = renderHook(() => useGazeTracking());

			const eventData = { action: "click", element: "button" };

			await act(async () => {
				await result.current.addEvent("user_interaction", eventData);
			});

			expect(eyeAnalysis.addEvent).toHaveBeenCalledWith(
				"user_interaction",
				eventData,
			);
			expect(result.current.eventsCount).toBe(1);
		});
	});
});
