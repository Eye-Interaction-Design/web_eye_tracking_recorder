import React from 'react';
import { isValidWebSocketUrl } from 'eye-analysis/utils';
import type { AppState } from '../hooks/useAppState';

interface ConfigSectionProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  onInitialize: () => void;
  disabled: boolean;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  appState,
  updateAppState,
  onInitialize,
  disabled
}) => {
  const isUrlValid = !appState.eyeTrackingServerUrl.trim() || 
                    isValidWebSocketUrl(appState.eyeTrackingServerUrl.trim());

  return (
    <div className="config-section">
      <h3>Step 1: Initialize Tracking</h3>
      <p><em>Configure your eye tracking setup, recording mode, and initialize the system.</em></p>
      
      <div className="form-group">
        <label htmlFor="eyeTrackingServerUrl">Eye Tracking Server URL:</label>
        <input
          type="text"
          id="eyeTrackingServerUrl"
          placeholder="ws://localhost:8080 (leave empty for mouse simulation)"
          value={appState.eyeTrackingServerUrl}
          onChange={(e) => updateAppState({ eyeTrackingServerUrl: e.target.value })}
          disabled={disabled}
          style={{ width: '300px' }}
        />
        {!isUrlValid && (
          <div className="url-validation">
            Invalid WebSocket URL format. Use ws:// or wss://
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="recordingMode">Recording Mode:</label>
        <select
          id="recordingMode"
          value={appState.recordingMode}
          onChange={(e) => updateAppState({ recordingMode: e.target.value as any })}
          disabled={disabled}
        >
          <option value="current-tab">Current Tab</option>
          <option value="full-screen">Full Screen</option>
        </select>
      </div>

      <div className="tracking-mode">
        <strong>Mode:</strong>{' '}
        <span className="mode-text">
          {appState.adaptorType === 'eye-tracking' ? 'Eye Tracking' : 'Mouse Simulation'}
        </span>
      </div>

      <button
        className="button"
        onClick={onInitialize}
        disabled={disabled}
      >
        Initialize Tracking
      </button>
    </div>
  );
};