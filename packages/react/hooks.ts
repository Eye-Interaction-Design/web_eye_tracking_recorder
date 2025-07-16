// React hooks for Eye Analysis

import {
  addSessionEvent,
  type RecorderState,
  getCurrentState,
  subscribe,
  initialize,
  type SessionConfig,
  type RecordingConfig,
  createSession,
  startRecording,
  stopRecording,
  type GazePointInput,
  type DownloadSessionOptions,
  getCurrentSession,
  downloadSession,
} from "../eye-analysis/dist/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook for managing recorder state with automatic re-renders
 */
export const useRecorderState = () => {
  const [state, setState] = useState<RecorderState>(getCurrentState());

  useEffect(() => {
    const unsubscribe = subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  return state;
};

/**
 * Hook for basic recording functionality
 */
export const useRecording = () => {
  const state = useRecorderState();
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeRecorder = useCallback(async () => {
    try {
      setError(null);
      await initialize();
      setIsInitialized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize");
      throw err;
    }
  }, []);

  const createNewSession = useCallback(
    async (config: SessionConfig, recordingConfig?: RecordingConfig): Promise<string> => {
      try {
        setError(null);
        // Convert to ExperimentConfig format
        const experimentConfig = {
          participantId: config.participantId,
          experimentType: config.experimentType,
          sessionId: config.sessionId,
          recording: recordingConfig,
        };
        return await createSession(experimentConfig);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create session");
        throw err;
      }
    },
    []
  );

  const startRecordingSession = useCallback(async () => {
    try {
      setError(null);
      await startRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
      throw err;
    }
  }, []);

  const stopRecordingSession = useCallback(async () => {
    try {
      setError(null);
      await stopRecording();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      throw err;
    }
  }, []);

  return {
    // State
    isInitialized,
    isRecording: state.isRecording,
    currentSession: state.currentSession,
    recordingDuration: state.recordingDuration,
    gazeDataCount: state.gazeDataCount,
    eventsCount: state.eventsCount,
    error: error || state.error,
    status: state.status,

    // Actions
    initialize: initializeRecorder,
    createSession: createNewSession,
    startRecording: startRecordingSession,
    stopRecording: stopRecordingSession,
  };
};

/**
 * Hook for managing gaze data collection
 */
export const useGazeTracking = () => {
  const [error, setError] = useState<string | null>(null);
  const [lastGazePoint, setLastGazePoint] = useState<GazePointInput | null>(null);
  const state = useRecorderState();

  const addGazePoint = useCallback(async (gazePoint: GazePointInput) => {
    try {
      setError(null);
      // await addGazeData(gazePoint)
      setLastGazePoint(gazePoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add gaze data");
      throw err;
    }
  }, []);

  const addUserEvent = useCallback(async (type: string, data?: Record<string, unknown>) => {
    try {
      setError(null);
      await addSessionEvent(type, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add event");
      throw err;
    }
  }, []);

  return {
    // State
    gazeDataCount: state.gazeDataCount,
    eventsCount: state.eventsCount,
    lastGazePoint,
    error,

    // Actions
    addGazeData: addGazePoint,
    addEvent: addUserEvent,
  };
};

/**
 * Hook for session export and download functionality
 */
export const useSessionExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadSessionData = useCallback(
    async (sessionId?: string, options?: DownloadSessionOptions) => {
      try {
        setIsExporting(true);
        setError(null);

        const currentSession = getCurrentSession();
        const targetSessionId = sessionId || currentSession?.sessionId;

        if (!targetSessionId) {
          throw new Error("No session ID provided and no active session");
        }

        await downloadSession(targetSessionId, options);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to download session");
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const saveAndDownloadExperiment = useCallback(
    async (sessionId?: string, _experimentMetadata?: Record<string, unknown>) => {
      try {
        setIsExporting(true);
        setError(null);

        const currentSession = getCurrentSession();
        const targetSessionId = sessionId || currentSession?.sessionId;

        if (!targetSessionId) {
          throw new Error("No session ID provided and no active session");
        }

        // Download as ZIP by default for save experiment
        await downloadSession(targetSessionId, {
          include: { metadata: true, gaze: true, events: true, video: true },
          asZip: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save experiment data");
        throw err;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return {
    // State
    isExporting,
    error,

    // Actions
    downloadSession: downloadSessionData,
    saveExperiment: saveAndDownloadExperiment,
  };
};

/**
 * Hook for automatic gaze data collection with mouse tracking
 */
export const useMouseGazeTracking = (enabled: boolean = true) => {
  const { addGazeData } = useGazeTracking();
  const [isTracking, setIsTracking] = useState(false);
  const trackingRef = useRef<boolean>(false);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!trackingRef.current) return;

      // Use mouse position as simulated gaze data
      const gazePoint: GazePointInput = {
        screenX: event.screenX,
        screenY: event.screenY,
        confidence: 0.8, // Simulated confidence for mouse tracking
        leftEye: {
          screenX: event.screenX - 2,
          screenY: event.screenY,
        },
        rightEye: {
          screenX: event.screenX + 2,
          screenY: event.screenY,
        },
      };

      addGazeData(gazePoint).catch(console.error);
    },
    [addGazeData]
  );

  const startTracking = useCallback(() => {
    if (!enabled) return;

    trackingRef.current = true;
    setIsTracking(true);
    document.addEventListener("mousemove", handleMouseMove);
  }, [enabled, handleMouseMove]);

  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    setIsTracking(false);
    document.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return {
    isTracking,
    startTracking,
    stopTracking,
  };
};

/**
 * Comprehensive hook that combines all recorder functionality
 */
export const useEyeTracker = (autoInitialize: boolean = true) => {
  const recording = useRecording();
  const gazeTracking = useGazeTracking();
  const sessionExport = useSessionExport();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (autoInitialize && !recording.isInitialized) {
      recording
        .initialize()
        .then(() => setIsReady(true))
        .catch(console.error);
    } else if (recording.isInitialized) {
      setIsReady(true);
    }
  }, [autoInitialize, recording.isInitialized, recording.initialize]);

  const createAndStartSession = useCallback(
    async (config: SessionConfig, recordingConfig?: RecordingConfig) => {
      const sessionId = await recording.createSession(config, recordingConfig);
      await recording.startRecording();
      return sessionId;
    },
    [recording]
  );

  const stopAndDownloadSession = useCallback(
    async (experimentMetadata?: Record<string, unknown>) => {
      await recording.stopRecording();
      if (recording.currentSession) {
        await sessionExport.saveExperiment(recording.currentSession.sessionId, experimentMetadata);
      }
    },
    [recording, sessionExport]
  );

  return {
    // State
    isReady,
    isInitialized: recording.isInitialized,
    isRecording: recording.isRecording,
    isExporting: sessionExport.isExporting,
    currentSession: recording.currentSession,
    recordingDuration: recording.recordingDuration,
    gazeDataCount: gazeTracking.gazeDataCount,
    eventsCount: gazeTracking.eventsCount,
    status: recording.status,
    error: recording.error || gazeTracking.error || sessionExport.error,

    // Core actions
    initialize: recording.initialize,
    createSession: recording.createSession,
    startRecording: recording.startRecording,
    stopRecording: recording.stopRecording,

    // Convenience actions
    createAndStartSession,
    stopAndDownloadSession,

    // Data collection
    addGazeData: gazeTracking.addGazeData,
    addEvent: gazeTracking.addEvent,

    // Export
    downloadSession: sessionExport.downloadSession,
    saveExperiment: sessionExport.saveExperiment,
  };
};
