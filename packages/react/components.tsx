// React components for Web Eye Tracking Recorder

import React, { useState } from 'react';
import { useEyeTrackerContext } from './context';
import { useMouseGazeTracking } from './hooks';
import type { SessionConfig, RecordingConfig } from '../../src/index';

interface RecordingControlsProps {
  participantId?: string;
  experimentType?: string;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
  className?: string;
}

/**
 * Ready-to-use recording controls component
 */
export const RecordingControls: React.FC<RecordingControlsProps> = ({
  participantId = 'participant-001',
  experimentType = 'experiment',
  onSessionStart,
  onSessionEnd,
  className = '',
}) => {
  const {
    isReady,
    isRecording,
    isExporting,
    error,
    createAndStartSession,
    stopAndDownloadSession,
  } = useEyeTrackerContext();
  
  const [localParticipantId, setLocalParticipantId] = useState(participantId);
  const [localExperimentType, setLocalExperimentType] = useState(experimentType);
  
  const handleStartRecording = async () => {
    try {
      const sessionConfig: SessionConfig = {
        participantId: localParticipantId,
        experimentType: localExperimentType,
      };
      
      const recordingConfig: RecordingConfig = {
        frameRate: 30,
        quality: 'high',
        videoFormat: 'webm',
      };
      
      const sessionId = await createAndStartSession(sessionConfig, recordingConfig);
      onSessionStart?.(sessionId);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };
  
  const handleStopRecording = async () => {
    try {
      await stopAndDownloadSession({
        completedAt: new Date().toISOString(),
        participantId: localParticipantId,
        experimentType: localExperimentType,
      });
      onSessionEnd?.();
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };
  
  if (!isReady) {
    return (
      <div className={`recording-controls ${className}`}>
        <div>Initializing eye tracker...</div>
      </div>
    );
  }
  
  return (
    <div className={`recording-controls ${className}`}>
      {!isRecording ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Participant ID:
              <input
                type="text"
                value={localParticipantId}
                onChange={(e) => setLocalParticipantId(e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
            </label>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>
              Experiment Type:
              <input
                type="text"
                value={localExperimentType}
                onChange={(e) => setLocalExperimentType(e.target.value)}
                style={{ marginLeft: '0.5rem' }}
              />
            </label>
          </div>
          <button
            onClick={handleStartRecording}
            disabled={!isReady}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '1rem 2rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Start Recording
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <strong>Recording in progress...</strong>
          </div>
          <button
            onClick={handleStopRecording}
            disabled={isExporting}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              padding: '1rem 2rem',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isExporting ? 'Stopping & Saving...' : 'Stop Recording'}
          </button>
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginTop: '1rem' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

interface RecordingStatusProps {
  className?: string;
}

/**
 * Component that displays current recording status and statistics
 */
export const RecordingStatus: React.FC<RecordingStatusProps> = ({ className = '' }) => {
  const {
    isReady,
    isRecording,
    isExporting,
    currentSession,
    recordingDuration,
    gazeDataCount,
    eventsCount,
    status,
  } = useEyeTrackerContext();
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`recording-status ${className}`}>
      <h3>Recording Status</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <strong>Status:</strong> {status}
        </div>
        <div>
          <strong>Ready:</strong> {isReady ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Recording:</strong> {isRecording ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Exporting:</strong> {isExporting ? 'Yes' : 'No'}
        </div>
      </div>
      
      {currentSession && (
        <div style={{ marginTop: '1rem' }}>
          <h4>Current Session</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <strong>Session ID:</strong> {currentSession.sessionId}
            </div>
            <div>
              <strong>Participant:</strong> {currentSession.participantId}
            </div>
            <div>
              <strong>Experiment:</strong> {currentSession.experimentType}
            </div>
            <div>
              <strong>Duration:</strong> {formatDuration(recordingDuration)}
            </div>
            <div>
              <strong>Gaze Points:</strong> {gazeDataCount}
            </div>
            <div>
              <strong>Events:</strong> {eventsCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MouseTrackerProps {
  enabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Component that enables mouse-based gaze tracking for demo purposes
 */
export const MouseTracker: React.FC<MouseTrackerProps> = ({ 
  enabled = true, 
  className = '',
  children 
}) => {
  const { isTracking, startTracking, stopTracking } = useMouseGazeTracking(enabled);
  const { isRecording } = useEyeTrackerContext();
  
  React.useEffect(() => {
    if (isRecording && enabled && !isTracking) {
      startTracking();
    } else if (!isRecording && isTracking) {
      stopTracking();
    }
  }, [isRecording, enabled, isTracking, startTracking, stopTracking]);
  
  return (
    <div className={`mouse-tracker ${className}`}>
      {children}
      {enabled && (
        <div style={{ 
          position: 'fixed', 
          bottom: '1rem', 
          right: '1rem', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '0.5rem', 
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          Mouse Tracking: {isTracking ? 'Active' : 'Inactive'}
        </div>
      )}
    </div>
  );
};

interface ExperimentContainerProps {
  participantId?: string;
  experimentType?: string;
  enableMouseTracking?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Complete experiment container with all functionality built-in
 */
export const ExperimentContainer: React.FC<ExperimentContainerProps> = ({
  participantId,
  experimentType,
  enableMouseTracking = true,
  children,
  className = '',
}) => {
  return (
    <div className={`experiment-container ${className}`}>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <RecordingControls 
          participantId={participantId}
          experimentType={experimentType}
        />
        <RecordingStatus />
      </div>
      
      <MouseTracker enabled={enableMouseTracking}>
        <div className="experiment-content">
          {children}
        </div>
      </MouseTracker>
    </div>
  );
};