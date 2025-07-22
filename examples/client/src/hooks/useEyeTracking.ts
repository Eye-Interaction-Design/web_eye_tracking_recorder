import { useState, useCallback, useEffect } from "react";
import {
  initialize as coreInitialize,
  startRecording as coreStartRecording,
  stopRecording as coreStopRecording,
  onStateChanged,
  downloadSession as coreDownloadSession,
  onGaze,
  addEvent,
  type ExperimentConfig,
  type RecorderState,
} from "eye-analysis";
import { exportExperimentDataset } from "eye-analysis/recorder/export";
import {
  getCurrentTrackingMode,
  getTrackingQuality,
  isTrackingActive,
  websocketTrackingAdaptor,
  mouseTrackingAdaptor,
  type TrackingAdaptor,
} from "eye-analysis/tracking";
import { isValidWebSocketUrl } from "eye-analysis/utils";
import type { GazePoint } from "eye-analysis/recorder/types";
import type { AppState } from "./useAppState";

interface ExperimentState {
  isInitialized: boolean;
  isRecording: boolean;
  currentSession: any;
  gazeDataCount: number;
  eventsCount: number;
  recordingDuration: number;
  error: string | null;
}

export const useEyeTracking = (
  appState: AppState,
  updateAppState: (updates: Partial<AppState>) => void,
  log: (message: string) => void
) => {
  const [experimentState, setExperimentState] = useState<ExperimentState>({
    isInitialized: false,
    isRecording: false,
    currentSession: null,
    gazeDataCount: 0,
    eventsCount: 0,
    recordingDuration: 0,
    error: null,
  });

  const [latestGazePoint, setLatestGazePoint] = useState<GazePoint | null>(null);

  // Create tracking adaptor based on URL configuration
  const createTrackingAdaptor = useCallback((): {
    adaptor: TrackingAdaptor;
    type: "eye-tracking" | "mouse-simulation";
  } => {
    const url = appState.eyeTrackingServerUrl.trim();

    if (url && isValidWebSocketUrl(url)) {
      log(`Creating WebSocket adaptor for: ${url}`);
      return {
        adaptor: websocketTrackingAdaptor(url, {
          autoReconnect: true,
          timeout: 10000,
        }),
        type: "eye-tracking",
      };
    } else {
      log("Creating mouse simulation adaptor");
      return {
        adaptor: mouseTrackingAdaptor({
          confidenceRange: [0.7, 0.9],
          saccadeSimulation: true,
          blinkSimulation: true,
        }),
        type: "mouse-simulation",
      };
    }
  }, [appState.eyeTrackingServerUrl, log]);

  // Initialize tracking system
  const initialize = useCallback(async () => {
    try {
      log("Initializing recorder...");

      const { adaptor, type } = createTrackingAdaptor();
      updateAppState({ adaptorType: type });

      await coreInitialize({
        trackingAdaptor: adaptor,
        onlyCurrentTabAvailable: appState.recordingMode === "current-tab",
      });

      // Set up gaze data callback
      onGaze((gazePoint: GazePoint) => {
        console.log(gazePoint);
        setLatestGazePoint(gazePoint);
      });

      log(`Recorder initialized successfully with ${type} adaptor`);
    } catch (error) {
      log(`Initialization failed: ${error}`);
    }
  }, [appState.recordingMode, createTrackingAdaptor, updateAppState, log]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      log("Starting new recording session...");

      const config: ExperimentConfig = {
        participantId: appState.participantId,
        experimentType: appState.adaptorType || "mouse-simulation",
        recording: {
          frameRate: 30,
          quality: "high",
          videoFormat: "webm",
          chunkDuration: 5,
          captureEntireScreen: appState.recordingMode === "full-screen",
        },
      };

      const sessionId = await coreStartRecording(config);
      log(`Session created and recording started: ${sessionId}`);
      log(
        `Config used: participantId=${config.participantId}, experimentType=${config.experimentType}`
      );

      const currentMode = getCurrentTrackingMode();
      if (currentMode.includes("WebSocket")) {
        log("WebSocket eye tracking is active");
      } else if (currentMode.includes("Mouse")) {
        log("Mouse simulation is active - move your mouse around to generate gaze data");
      } else {
        log("Tracking system ready");
      }
    } catch (error) {
      log(`Recording start failed: ${error}`);
    }
  }, [appState.participantId, appState.adaptorType, appState.recordingMode, log]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      log("Stopping recording and ending session...");
      const result = await coreStopRecording();

      log(
        `Stop recording result: sessionId=${result.sessionId}, sessionInfo=${
          result.sessionInfo ? "exists" : "null"
        }`
      );

      if (result.sessionInfo) {
        const newSessions = new Map(appState.sessions);
        newSessions.set(result.sessionId, result.sessionInfo);
        updateAppState({ sessions: newSessions });
        log(`Session ${result.sessionId} completed and stored`);
        log(`Total sessions in store: ${newSessions.size}`);
      } else {
        log(`Warning: No session info returned for ${result.sessionId}`);
      }

      log("Recording stopped and session ended successfully");
    } catch (error) {
      log(`Recording stop failed: ${error}`);
    }
  }, [appState.sessions, updateAppState, log]);

  // Download session
  const downloadSession = useCallback(
    async (type: "json" | "components" | "zip") => {
      try {
        const options = {
          json: {
            include: { metadata: true, gaze: false, events: false, video: false },
            asZip: false,
          },
          components: {
            include: { metadata: true, gaze: true, events: true, video: true },
            asZip: false,
          },
          zip: { include: { metadata: true, gaze: true, events: true, video: true }, asZip: true },
        };

        log(`Downloading ${type}...`);
        await coreDownloadSession(undefined, options[type]);
        log(`${type} download completed`);
      } catch (error) {
        log(`${type} download failed: ${error}`);
      }
    },
    [log]
  );

  // Export all sessions
  const exportAll = useCallback(async () => {
    try {
      log("Exporting all sessions as combined dataset...");

      if (appState.sessions.size === 0) {
        log("No completed sessions to export");
        return;
      }

      const sessionIds = Array.from(appState.sessions.keys());
      log(`Found ${sessionIds.length} session(s) to export`);

      await exportExperimentDataset(sessionIds, {
        include: { metadata: true, gaze: true, events: true, video: true },
        asZip: true,
      });

      log("All sessions exported successfully as combined dataset");
    } catch (error) {
      log(`Export all failed: ${error}`);
    }
  }, [appState.sessions, log]);

  // Record task interaction
  const recordTaskInteraction = useCallback(
    async (taskName: string) => {
      try {
        await addEvent("interaction", {
          action: "task_click",
          taskName: taskName,
          timestamp: Date.now(),
        });
        log(`Task interaction recorded: ${taskName}`);
      } catch (error) {
        log(`Failed to record task interaction: ${error}`);
      }
    },
    [log]
  );

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = onStateChanged((state: RecorderState) => {
      setExperimentState({
        isInitialized:
          state.status === "initialized" ||
          state.status === "recording" ||
          state.status === "stopped",
        isRecording: state.isRecording,
        currentSession: state.currentSession,
        gazeDataCount: state.gazeDataCount,
        eventsCount: state.eventsCount,
        recordingDuration: state.recordingDuration,
        error: state.error,
      });

      if (state.error) {
        log(`Error: ${state.error}`);
      }
    });

    return unsubscribe;
  }, [log]);

  return {
    experimentState,
    latestGazePoint,
    initialize,
    startRecording,
    stopRecording,
    downloadSession,
    exportAll,
    recordTaskInteraction,
  };
};
