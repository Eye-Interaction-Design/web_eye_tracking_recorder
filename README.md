# Browser Eye Tracking

[\![CI](https://github.com/your-org/browser-eye-tracking/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/browser-eye-tracking/actions/workflows/ci.yml)

An experimental browser library for integrating screen recording and eye tracking functionality in web applications.

## Features

- 🎥 **Screen Recording** - High-quality screen capture using MediaRecorder API
- 👁️ **Eye Tracking** - WebSocket-based eye tracking integration
- 💾 **Data Storage** - IndexedDB for persistent data storage
- ⏱️ **Synchronization** - High-precision timestamp synchronization (±16ms accuracy)
- 🧪 **Testing** - Comprehensive test suite with browser API mocking
- 🏗️ **TypeScript** - Full TypeScript support with type definitions

## Installation

```bash
bun add browser-eye-tracking
```

Or with npm:
```bash
npm install browser-eye-tracking
```

## Quick Start

```javascript
import {
  initializeExperiment,
  createSession,
  startExperiment,
  stopExperiment,
  calibrateEyeTracking,
  onGazeData,
  onSessionEvent
} from 'browser-eye-tracking';

// Initialize the system
await initializeExperiment({
  eyeTrackingServerUrl: 'ws://localhost:8080', // Base URL, /eye_tracking is added automatically
  enableEyeTracking: true // Set to false for screen recording only
});

// Create a session
const sessionId = await createSession({
  participantId: 'participant-001',
  experimentType: 'user-study',
  recording: {
    frameRate: 30,
    quality: 'high',
    chunkDuration: 10
  },
  eyeTracking: {
    samplingRate: 60,
    calibrationPoints: 9
  }
});

// Set up event listeners
onGazeData((gazePoint) => {
  console.log('Gaze position:', gazePoint.screenX, gazePoint.screenY);
});

onSessionEvent((event) => {
  console.log('Session event:', event.type, event.data);
});

// Calibrate eye tracking (if enabled)
await calibrateEyeTracking();

// Start recording
await startExperiment();

// Stop recording
const result = await stopExperiment();
console.log('Session completed:', result.sessionId);
```

## Screen Recording Only

For screen recording without eye tracking:

```javascript
import {
  initializeExperiment,
  createSession,
  startExperiment,
  stopExperiment
} from 'browser-eye-tracking';

// Initialize without eye tracking
await initializeExperiment({
  enableEyeTracking: false
});

// Create session with recording config only
const sessionId = await createSession({
  participantId: 'recording-test',
  recording: {
    frameRate: 30,
    quality: 'high'
  }
});

await startExperiment();
// ... recording happens ...
await stopExperiment();
```

## Development

### Setup

```bash
bun install
```

### Build

```bash
bun run build
```

### Test

```bash
bun test
```

### Lint

```bash
bun run lint
```

### Examples

Start the development server for examples:

```bash
cd examples
bun run serve
```

Available demos:
- **Full Demo**: `http://localhost:3000` - Complete eye tracking and screen recording
- **Screen Recording Only**: `http://localhost:3000/screen-recording` - Recording without eye tracking

For testing with eye tracking, start the mock server:

```bash
cd examples
bun run mock-eye-server
```

## API Documentation

See [docs/API.md](docs/API.md) for complete API documentation.

## Browser Support

- Chrome/Chromium 88+
- Firefox 87+
- Safari 14+
- Edge 88+

Requires support for:
- MediaRecorder API
- IndexedDB
- WebSocket (for eye tracking)
- Screen Capture API

## Architecture

The library is designed with modular architecture:

- **Screen Recording** (`src/services/screen-recording.ts`) - Independent recording functionality
- **Eye Tracking** (`src/services/eye-tracking.ts`) - WebSocket-based eye tracking integration
- **Database** (`src/services/database.ts`) - IndexedDB data persistence
- **Synchronization** (`src/services/synchronization.ts`) - Timestamp management
- **Main API** (`src/experiment-recorder.ts`) - Unified interface

## Data Storage

Data is stored locally in IndexedDB with the following structure:

- **Sessions** - Experiment session metadata
- **Events** - Session events and markers
- **VideoChunks** - Recording data in time-ordered chunks
- **GazeData** - Eye tracking data points (if enabled)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `bun test`
6. Check linting: `bun run lint`
7. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Security

This library is designed for research purposes. Be aware that:

- Screen recording requires user permission
- Eye tracking data should be handled according to privacy regulations
- Data is stored locally in browser IndexedDB
- WebSocket connections should be secured (wss://) in production

## Support

For issues and questions:
- Check the [examples](examples/) directory
- Review the [API documentation](docs/API.md)
- Open an issue on GitHub
EOF < /dev/null