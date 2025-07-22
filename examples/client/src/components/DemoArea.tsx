import React from 'react';
import { getCurrentTrackingMode, getTrackingQuality } from 'eye-analysis/tracking';

interface ExperimentState {
  isInitialized: boolean;
  isRecording: boolean;
  currentSession: any;
  gazeDataCount: number;
  eventsCount: number;
  recordingDuration: number;
  error: string | null;
}

interface DemoAreaProps {
  experimentState: ExperimentState;
  onTaskClick: (taskName: string) => void;
  adaptorType: "eye-tracking" | "mouse-simulation" | null;
}

export const DemoArea: React.FC<DemoAreaProps> = ({
  experimentState,
  onTaskClick,
  adaptorType
}) => {
  const handleClick = () => {
    if (experimentState.currentSession) {
      onTaskClick('Demo Area Click');
    }
  };

  const getTitle = () => {
    const trackingMode = getCurrentTrackingMode();
    if (trackingMode.includes("WebSocket")) {
      return "Demo Area - Eye tracking active";
    } else if (trackingMode.includes("Mouse")) {
      return "Demo Area - Move your mouse to simulate gaze";
    } else {
      return "Demo Area - No tracking active";
    }
  };

  const getDescription = () => {
    const trackingMode = getCurrentTrackingMode();
    const trackingQuality = getTrackingQuality();
    return `Current mode: ${trackingMode} (Quality: ${trackingQuality})`;
  };

  const showServerInfo = () => {
    const trackingMode = getCurrentTrackingMode();
    return trackingMode.includes("WebSocket");
  };

  return (
    <div className="demo-area" onClick={handleClick}>
      <h3>{getTitle()}</h3>
      <p>{getDescription()}</p>
      {showServerInfo() && (
        <p className="server-info">Eye tracking server connected</p>
      )}
      <div className="demo-instructions">
        {experimentState.currentSession ? (
          <span>Click here to record an interaction event</span>
        ) : (
          <span>Start a recording session to enable interactions</span>
        )}
      </div>
    </div>
  );
};