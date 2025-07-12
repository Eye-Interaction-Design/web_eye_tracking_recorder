# Browser Eye Tracking Examples

This directory contains examples for the `browser-eye-tracking` library.

## Important Notice

⚠️ **This is a browser-only library** that cannot run in Node.js/Bun environments because it uses browser-specific APIs:

- IndexedDB for data storage
- MediaRecorder for screen recording
- WebSocket for eye tracking
- Screen capture APIs
- DOM APIs

## Running Examples

### Browser Demo

1. Start the development server:
   ```bash
   bun run serve
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Open browser DevTools to see console output and interact with the demo

### Available Demos

1. **Full Demo** - `http://localhost:3000`
   - Complete eye tracking and screen recording functionality
   - Requires WebSocket eye tracking server (use mock server below)

2. **Screen Recording Only** - `http://localhost:3000/screen-recording`
   - Tests only screen recording functionality
   - No eye tracking dependencies
   - Perfect for validating MediaRecorder API integration

### Mock Eye Tracking Server

For testing the full demo, start the mock eye tracking server:

```bash
bun run mock-eye-server
```

This will start a WebSocket server on `ws://localhost:8080` that simulates:
- 60Hz gaze data stream with realistic eye movement patterns
- Calibration process (2-second simulation)
- Connection management
- Web interface at `http://localhost:8080` for monitoring

The mock server generates realistic gaze data including:
- Smooth eye movement patterns with natural variations
- Left/right eye differentiation
- Confidence levels (85-95%)
- Pupil size variations
- Proper timestamp synchronization

### Files

- `index.html` - Complete browser demo using the actual library
- `screen-recording-only.html` - Screen recording focused demo
- `server.ts` - Development server that serves the HTML demos
- `package.json` - Package configuration for examples

## Usage in Your Project

To use this library in your web application:

```html
<script type="module">
import {
    initializeExperiment,
    createSession,
    startExperiment,
    stopExperiment,
    calibrateEyeTracking,
    onGazeData,
    onSessionEvent
} from './path/to/browser-eye-tracking/index.js';

// Your implementation here
</script>
```

Or with a bundler like Vite, Webpack, etc.:

```javascript
import * as EyeTracking from 'browser-eye-tracking';
```
EOF < /dev/null