import React, { useState, useEffect, useCallback } from 'react';
import { ConfigSection } from './components/ConfigSection';
import { ControlPanel } from './components/ControlPanel';
import { StatusDisplay } from './components/StatusDisplay';
import { DemoArea } from './components/DemoArea';
import { DebugInfo } from './components/DebugInfo';
import { SessionManagement } from './components/SessionManagement';
import { LogDisplay } from './components/LogDisplay';
import { useEyeTracking } from './hooks/useEyeTracking';
import { useAppState } from './hooks/useAppState';
import type { GazePoint } from 'eye-analysis/recorder/types';

const App: React.FC = () => {
  const { appState, updateAppState, log } = useAppState();
  const { 
    initialize, 
    startRecording, 
    stopRecording, 
    downloadSession, 
    exportAll,
    recordTaskInteraction,
    latestGazePoint,
    experimentState 
  } = useEyeTracking(appState, updateAppState, log);

  // Initialize on component mount
  useEffect(() => {
    log('Eye Analysis React Demo loaded');
    log('Multiple session management enabled - create, record, and export sessions');
  }, [log]);

  return (
    <div className="container">
      <div className="header">
        <h1>Eye Analysis - React Demo</h1>
        <p>Advanced eye tracking and screen recording with React integration</p>
        <div className="recording-info">
          <strong>📹 Recording Target:</strong> The system will automatically request the appropriate recording mode based on your selection below. Current Tab mode will only show this tab option, Full Screen mode will show screen sharing options.
        </div>
      </div>

      <StatusDisplay experimentState={experimentState} />

      <ConfigSection
        appState={appState}
        updateAppState={updateAppState}
        onInitialize={initialize}
        disabled={experimentState.isInitialized}
      />

      <ControlPanel
        appState={appState}
        updateAppState={updateAppState}
        experimentState={experimentState}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onDownloadSession={downloadSession}
        onExportAll={exportAll}
      />

      <DemoArea
        experimentState={experimentState}
        onTaskClick={recordTaskInteraction}
        adaptorType={appState.adaptorType}
      />

      <DebugInfo
        latestGazePoint={latestGazePoint}
      />

      <SessionManagement
        sessions={appState.sessions}
        currentSession={experimentState.currentSession}
      />

      <LogDisplay logs={appState.logs} />
    </div>
  );
};

export default App;