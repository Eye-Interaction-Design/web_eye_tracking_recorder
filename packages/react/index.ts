// React integration exports for Web Eye Tracking Recorder

export * from './hooks';
export * from './context';
export * from './components';

// Re-export core types that are commonly used in React components
export type {
  SessionConfig,
  RecordingConfig,
  GazePointInput,
  RecorderState,
  SessionInfo,
  DownloadOptions,
} from '../../src/index';