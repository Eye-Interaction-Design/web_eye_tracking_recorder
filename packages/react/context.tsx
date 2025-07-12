// React Context Provider for Web Eye Tracking Recorder

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useEyeTracker } from './hooks';
import type { SessionConfig, RecordingConfig } from '../../src/index';

interface EyeTrackerContextType {
  // State
  isReady: boolean;
  isInitialized: boolean;
  isRecording: boolean;
  isExporting: boolean;
  currentSession: any;
  recordingDuration: number;
  gazeDataCount: number;
  eventsCount: number;
  status: string;
  error: string | null;
  
  // Core actions
  initialize: () => Promise<void>;
  createSession: (config: SessionConfig, recordingConfig?: RecordingConfig) => Promise<string>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  
  // Convenience actions
  createAndStartSession: (config: SessionConfig, recordingConfig?: RecordingConfig) => Promise<string>;
  stopAndDownloadSession: (experimentMetadata?: Record<string, any>) => Promise<void>;
  
  // Data collection
  addGazeData: (gazePoint: any) => Promise<void>;
  addEvent: (type: string, data?: Record<string, any>) => Promise<void>;
  
  // Export
  downloadSession: (sessionId?: string, options?: any) => Promise<void>;
  saveExperiment: (sessionId?: string, experimentMetadata?: Record<string, any>) => Promise<void>;
}

const EyeTrackerContext = createContext<EyeTrackerContextType | null>(null);

interface EyeTrackerProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
}

/**
 * Provider component that wraps your app and provides eye tracking functionality
 */
export const EyeTrackerProvider = ({ 
  children, 
  autoInitialize = true 
}: EyeTrackerProviderProps): JSX.Element => {
  const eyeTracker = useEyeTracker(autoInitialize);
  
  return (
    <EyeTrackerContext.Provider value={eyeTracker}>
      {children}
    </EyeTrackerContext.Provider>
  );
};

/**
 * Hook to access eye tracker context
 */
export const useEyeTrackerContext = (): EyeTrackerContextType => {
  const context = useContext(EyeTrackerContext);
  if (!context) {
    throw new Error('useEyeTrackerContext must be used within an EyeTrackerProvider');
  }
  return context;
};

/**
 * HOC that provides eye tracking functionality to any component
 */
export function withEyeTracker<T extends object>(
  Component: React.ComponentType<T & { eyeTracker: EyeTrackerContextType }>
) {
  const WrappedComponent = (props: T) => {
    const eyeTracker = useEyeTrackerContext();
    
    return <Component {...props} eyeTracker={eyeTracker} />;
  };
  
  WrappedComponent.displayName = `withEyeTracker(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}