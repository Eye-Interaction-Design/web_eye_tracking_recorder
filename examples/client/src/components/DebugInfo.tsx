import React, { useState, useEffect } from 'react';
import type { GazePoint } from 'eye-analysis/recorder/types';

interface DebugInfoProps {
  latestGazePoint: GazePoint | null;
}

interface WindowState {
  screenX: number;
  screenY: number;
  scrollX: number;
  scrollY: number;
  innerWidth: number;
  innerHeight: number;
  outerWidth: number;
  outerHeight: number;
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ latestGazePoint }) => {
  const [windowState, setWindowState] = useState<WindowState>({
    screenX: window.screenX,
    screenY: window.screenY,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    outerWidth: window.outerWidth,
    outerHeight: window.outerHeight,
  });

  // Update window state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setWindowState({
        screenX: window.screenX,
        screenY: window.screenY,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const formatGazePoint = (point: GazePoint | null) => {
    if (!point) return 'No gaze data yet';
    
    return (
      <div className="debug-data">
        <div>screenX: {point.screenX ?? 'N/A'}</div>
        <div>screenY: {point.screenY ?? 'N/A'}</div>
        <div>contentX: {point.contentX ?? 'N/A'}</div>
        <div>contentY: {point.contentY ?? 'N/A'}</div>
        <div>confidence: {point.confidence ?? 'N/A'}</div>
        <div>browserTimestamp: {point.browserTimestamp ?? 'N/A'}</div>
        <div>systemTimestamp: {point.systemTimestamp ?? 'N/A'}</div>
      </div>
    );
  };

  const formatWindowState = (state: WindowState) => {
    return (
      <div className="debug-data">
        <div>screenX: {state.screenX}</div>
        <div>screenY: {state.screenY}</div>
        <div>scrollX: {state.scrollX}</div>
        <div>scrollY: {state.scrollY}</div>
        <div>innerWidth: {state.innerWidth}</div>
        <div>innerHeight: {state.innerHeight}</div>
        <div>outerWidth: {state.outerWidth}</div>
        <div>outerHeight: {state.outerHeight}</div>
      </div>
    );
  };

  return (
    <div className="debug-section">
      <h3>Debug Information</h3>
      <div className="debug-grid">
        <div className="debug-card">
          <strong>Latest Gaze Point:</strong>
          {formatGazePoint(latestGazePoint)}
        </div>
        <div className="debug-card">
          <strong>Window State:</strong>
          {formatWindowState(windowState)}
        </div>
      </div>
    </div>
  );
};