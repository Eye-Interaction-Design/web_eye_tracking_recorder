import React from 'react';
import type { AppState } from '../hooks/useAppState';

interface ExperimentState {
  isInitialized: boolean;
  isRecording: boolean;
  currentSession: any;
  gazeDataCount: number;
  eventsCount: number;
  recordingDuration: number;
  error: string | null;
}

interface ControlPanelProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  experimentState: ExperimentState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadSession: (type: 'json' | 'components' | 'zip') => void;
  onExportAll: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  appState,
  updateAppState,
  experimentState,
  onStartRecording,
  onStopRecording,
  onDownloadSession,
  onExportAll
}) => {
  const hasSession = !!experimentState.currentSession;
  const hasCompletedSessions = appState.sessions.size > 0;
  const canDownloadCurrentSession = hasSession && !experimentState.isRecording;

  return (
    <>
      <div className="config-section">
        <h3>Step 2: Recording Session</h3>
        <p><em>Set participant ID and record sessions. You can change participant ID between sessions.</em></p>
        
        <div className="form-group">
          <label htmlFor="participantId">Participant ID:</label>
          <input
            type="text"
            id="participantId"
            value={appState.participantId}
            onChange={(e) => updateAppState({ participantId: e.target.value })}
            disabled={experimentState.isRecording}
          />
        </div>

        <div className="button-group">
          <button
            className="button"
            onClick={onStartRecording}
            disabled={!experimentState.isInitialized || experimentState.isRecording}
          >
            Start Recording
          </button>
          <button
            className="button danger"
            onClick={onStopRecording}
            disabled={!experimentState.isRecording}
          >
            Stop Recording
          </button>
        </div>
      </div>

      <div className="config-section">
        <h3>Step 3: Download Options</h3>
        <div className="download-grid">
          <button
            className="button"
            onClick={() => onDownloadSession('json')}
            disabled={!canDownloadCurrentSession}
          >
            Download JSON Only
          </button>
          <button
            className="button"
            onClick={() => onDownloadSession('components')}
            disabled={!canDownloadCurrentSession}
          >
            Download Components
          </button>
          <button
            className="button"
            onClick={() => onDownloadSession('zip')}
            disabled={!canDownloadCurrentSession}
          >
            Download ZIP
          </button>
          <button
            className="button"
            onClick={onExportAll}
            disabled={!hasCompletedSessions}
          >
            Export All Sessions
          </button>
        </div>
      </div>
    </>
  );
};