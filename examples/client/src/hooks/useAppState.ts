import { useState, useCallback } from 'react';
import { generateTimestamp } from 'eye-analysis/utils';
import type { RecordingMode } from 'eye-analysis/recorder/types';
import type { SessionInfo } from 'eye-analysis/recorder/types';

export interface AppState {
  logs: string[];
  participantId: string;
  eyeTrackingServerUrl: string;
  recordingMode: RecordingMode;
  sessions: Map<string, SessionInfo>;
  adaptorType: "eye-tracking" | "mouse-simulation" | null;
}

export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>({
    logs: [],
    participantId: 'demo-participant-001',
    eyeTrackingServerUrl: 'ws://localhost:8000/eye_tracking',
    recordingMode: 'current-tab',
    sessions: new Map(),
    adaptorType: null,
  });

  const updateAppState = useCallback((updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  }, []);

  const log = useCallback((message: string) => {
    const timestamp = generateTimestamp();
    const logEntry = `[${timestamp}] ${message}`;
    
    setAppState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-19), logEntry] // Keep last 20 entries
    }));
  }, []);

  return {
    appState,
    updateAppState,
    log
  };
};