# @web-eye-tracking-recorder/react

React integration for Web Eye Tracking Recorder - hooks, context, and components for easy React integration.

## Installation

```bash
npm install web-eye-tracking-recorder @web-eye-tracking-recorder/react
```

## Quick Start

### 1. Provider Setup

Wrap your app with the EyeTrackerProvider:

```jsx
import { EyeTrackerProvider } from '@web-eye-tracking-recorder/react';

function App() {
  return (
    <EyeTrackerProvider autoInitialize={true}>
      <YourExperimentComponent />
    </EyeTrackerProvider>
  );
}
```

### 2. Using Hooks

```jsx
import { useEyeTracker } from '@web-eye-tracking-recorder/react';

function ExperimentComponent() {
  const {
    isReady,
    isRecording,
    gazeDataCount,
    createAndStartSession,
    stopAndDownloadSession,
    addGazeData
  } = useEyeTracker();

  const handleStart = () => {
    createAndStartSession({
      participantId: 'participant-001',
      experimentType: 'usability-test'
    });
  };

  const handleStop = () => {
    stopAndDownloadSession({
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div>
      <div>Status: {isRecording ? 'Recording' : 'Ready'}</div>
      <div>Gaze points collected: {gazeDataCount}</div>
      
      {!isRecording ? (
        <button onClick={handleStart}>Start Recording</button>
      ) : (
        <button onClick={handleStop}>Stop & Download</button>
      )}
    </div>
  );
}
```

### 3. Ready-to-use Components

```jsx
import { 
  ExperimentContainer,
  RecordingControls,
  RecordingStatus,
  MouseTracker 
} from '@web-eye-tracking-recorder/react';

function App() {
  return (
    <EyeTrackerProvider>
      <ExperimentContainer
        participantId="participant-001"
        experimentType="usability-test"
        enableMouseTracking={true}
      >
        <div>Your experiment content here</div>
      </ExperimentContainer>
    </EyeTrackerProvider>
  );
}
```

## Available Hooks

### `useEyeTracker(autoInitialize?)`
Main hook combining all functionality:
- State: `isReady`, `isRecording`, `currentSession`, `gazeDataCount`, etc.
- Actions: `initialize`, `createSession`, `startRecording`, `stopRecording`
- Convenience: `createAndStartSession`, `stopAndDownloadSession`

### `useRecording()`
Core recording functionality:
- State management for sessions and recording
- Error handling

### `useGazeTracking()`
Gaze data collection:
- `addGazeData`, `addEvent`
- Tracking counts and last gaze point

### `useSessionExport()`
Export and download functionality:
- `downloadSession`, `saveExperiment`
- Export state tracking

### `useMouseGazeTracking(enabled?)`
Mouse-based gaze simulation for demos:
- `startTracking`, `stopTracking`, `isTracking`

## Components

### `<EyeTrackerProvider>`
Context provider for the entire app.

### `<RecordingControls>`
Ready-to-use recording start/stop controls with participant input.

### `<RecordingStatus>`
Displays current recording status and statistics.

### `<MouseTracker>`
Enables mouse-based gaze tracking for demos.

### `<ExperimentContainer>`
Complete experiment wrapper with all functionality.

## TypeScript Support

All hooks and components are fully typed with TypeScript. Core types are re-exported for convenience:

```typescript
import type { 
  SessionConfig, 
  RecordingConfig, 
  GazePointInput 
} from '@web-eye-tracking-recorder/react';
```

## License

MIT