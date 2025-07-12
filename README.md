# Web Eye Tracking Recorder

A lightweight, browser-based library for recording eye tracking data along with screen recordings for research and usability studies.

## Features

- 🎯 **Eye Tracking Data Collection**: Record gaze points with detailed metadata
- 📹 **Screen Recording**: Capture user interactions with WebM/MP4 support
- 📊 **Flexible Data Export**: JSON metadata, CSV time-series data, and video files
- 📦 **ZIP Download**: Package all session data into convenient archives
- 🛡️ **SSR Compatible**: Safe to use in Next.js, Nuxt.js and other SSR frameworks
- 🔄 **Real-time State Management**: Subscribe to recording state changes
- 💾 **IndexedDB Storage**: Client-side data persistence with automatic cleanup
- 🎨 **Framework Agnostic**: Works with vanilla JS, React, Vue, and more

## Installation

Install directly from this Git repository:

```bash
npm install git+https://github.com/shikibu9419/web-eye-tracking-recorder.git
```

Or using other package managers:

```bash
# Yarn
yarn add git+https://github.com/shikibu9419/web-eye-tracking-recorder.git

# pnpm
pnpm add git+https://github.com/shikibu9419/web-eye-tracking-recorder.git

# Bun
bun add git+https://github.com/shikibu9419/web-eye-tracking-recorder.git
```

## Quick Start

```javascript
import {
  initialize,
  createSession,
  startRecording,
  stopRecording,
  addGazeData,
  downloadSessionAsZip
} from 'web-eye-tracking-recorder';

// 1. Initialize the system
await initialize();

// 2. Create a session
const sessionId = await createSession({
  participantId: 'participant-001',
  experimentType: 'usability-test'
}, {
  frameRate: 30,
  quality: 'high',
  videoFormat: 'webm'
});

// 3. Start recording
await startRecording();

// 4. Add gaze data points
await addGazeData({
  screenX: 500,
  screenY: 300,
  confidence: 0.9,
  leftEye: { screenX: 495, screenY: 298 },
  rightEye: { screenX: 505, screenY: 302 }
});

// 5. Stop recording and download
await stopRecording();
await downloadSessionAsZip(sessionId);
```

## API Reference

### Core Functions

#### `initialize(): Promise<void>`
Initialize the recording system and set up IndexedDB storage.

#### `createSession(config, recordingConfig): Promise<string>`
Create a new recording session.

**Parameters:**
- `config`: Session configuration
  - `participantId`: Unique identifier for the participant
  - `experimentType`: Type of experiment being conducted
  - `sessionId?`: Optional custom session ID
- `recordingConfig`: Recording settings
  - `frameRate?`: Video frame rate (default: 30)
  - `quality?`: Video quality - 'low' | 'medium' | 'high'
  - `chunkDuration?`: Video chunk duration in seconds (default: 5)
  - `videoFormat?`: Video format - 'webm' | 'mp4'
  - `videoCodec?`: Video codec - 'vp8' | 'vp9' | 'h264'

#### `startRecording(): Promise<void>`
Start screen recording and data collection.

#### `stopRecording(): Promise<void>`
Stop recording and finalize the session.

#### `addGazeData(gazePoint): Promise<void>`
Add a gaze data point to the current session.

**Parameters:**
- `gazePoint`: Gaze point data
  - `screenX`, `screenY`: Screen coordinates
  - `confidence`: Tracking confidence (0-1)
  - `leftEye`, `rightEye`: Eye-specific data with screen coordinates
  - `systemTimestamp?`: Optional timestamp (auto-generated if not provided)

### Export Functions

#### `downloadSessionAsZip(sessionId, options): Promise<void>`
Download session data as a ZIP file.

**Options:**
- `includeMetadata?`: Include JSON metadata (default: true)
- `includeGazeData?`: Include gaze data CSV (default: true)
- `includeEvents?`: Include events CSV (default: true)
- `includeVideo?`: Include video recording (default: true)

#### `downloadSessionComponents(sessionId, options): Promise<void>`
Download individual session files separately.

#### `saveExperimentData(sessionId, metadata): Promise<void>`
Save experiment data and automatically download as ZIP.

### State Management

#### `subscribe(callback): () => void`
Subscribe to state changes. Returns an unsubscribe function.

```javascript
const unsubscribe = subscribe((state) => {
  console.log('Recording state:', state.isRecording);
  console.log('Gaze points collected:', state.gazeDataCount);
});

// Later...
unsubscribe();
```

#### `getCurrentState(): RecorderState`
Get the current recorder state.

#### `isRecording(): boolean`
Check if recording is currently active.

#### `getCurrentSession(): SessionInfo | null`
Get information about the current session.

### SSR Utilities

#### `isBrowser(): boolean`
Check if running in a browser environment.

#### `requireBrowser(functionName): void`
Throw an error if not in a browser environment.

#### `createSSRSafeAPI(browserAPI, fallbackAPI): T`
Create a version of your API that works safely in SSR environments.

## Data Structure

### Exported Data Files

When you download session data, you get:

1. **`metadata.json`**: Session information and summary statistics
2. **`gaze-data.csv`**: Time-series gaze tracking data
3. **`events.csv`**: User interaction events
4. **`recording.webm`**: Screen recording video

### CSV Format

**Gaze Data CSV** includes columns for:
- Timestamps (system and browser)
- Screen and window coordinates
- Eye-specific data (left/right eye positions, pupil size)
- Browser window information
- Screen dimensions

**Events CSV** includes:
- Event ID, session ID, type, timestamp
- Event-specific data (JSON encoded)

## Examples

Check the `examples/` directory for complete implementations:

- **Basic Demo** (`examples/basic-demo/`): Comprehensive vanilla JavaScript example
- **React Example** (coming soon): React hooks and components

## Browser Compatibility

- **Chrome/Chromium**: Full support with automatic tab selection
- **Firefox**: Full support (manual tab selection required)
- **Safari**: Limited support (WebM recording may have issues)
- **Edge**: Full support (manual tab selection required)

## Contributing

### Development Setup

```bash
# Clone the repository
git clone https://github.com/shikibu9419/web-eye-tracking-recorder.git
cd web-eye-tracking-recorder

# Install dependencies
bun install

# Build the library
bun run build

# Run tests
bun test

# Run linting
bun run lint
```

### Testing

The library uses Vitest with happy-dom for browser simulation:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

### Code Quality

```bash
# Format code
bun run format

# Lint code
bun run lint
```

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Security Considerations

- This library records screen content and user interactions
- Ensure compliance with privacy regulations (GDPR, CCPA, etc.)
- Always obtain proper consent before recording
- Data is stored locally in IndexedDB - implement your own server upload if needed
- Consider implementing data anonymization for sensitive applications

## Performance Notes

- IndexedDB storage has browser-specific quotas (typically ~50% of available disk space)
- Video recording can consume significant storage - use cleanup functions for long sessions
- The library automatically manages storage with configurable cleanup thresholds
- For production use, implement server-side data collection to avoid storage limits