import React from 'react';
import { formatDuration } from 'eye-analysis/utils';

interface ExperimentState {
  isInitialized: boolean;
  isRecording: boolean;
  currentSession: any;
  gazeDataCount: number;
  eventsCount: number;
  recordingDuration: number;
  error: string | null;
}

interface StatusDisplayProps {
  experimentState: ExperimentState;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ experimentState }) => {
  const getStatusText = () => {
    if (experimentState.isRecording) return 'Recording';
    if (experimentState.isInitialized) return 'Ready';
    return 'Not Initialized';
  };

  const getStatusClass = () => {
    if (experimentState.isRecording) return 'status recording';
    if (experimentState.isInitialized) return 'status idle';
    return 'status idle';
  };

  return (
    <>
      <div className={getStatusClass()}>
        <div className="status-content">
          <div><strong>Status:</strong> {getStatusText()}</div>
          <div><strong>Session:</strong> {experimentState.currentSession?.sessionId || 'None'}</div>
          <div><strong>Duration:</strong> {formatDuration(experimentState.recordingDuration)}</div>
          <div><strong>Gaze Points:</strong> {experimentState.gazeDataCount}</div>
          <div><strong>Events:</strong> {experimentState.eventsCount}</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-value">{formatDuration(experimentState.recordingDuration)}</div>
          <div className="metric-label">Duration</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{experimentState.gazeDataCount}</div>
          <div className="metric-label">Gaze Points</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{experimentState.eventsCount}</div>
          <div className="metric-label">Events</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {experimentState.isRecording ? 'Recording' : experimentState.isInitialized ? 'Ready' : 'Idle'}
          </div>
          <div className="metric-label">Status</div>
        </div>
      </div>
    </>
  );
};