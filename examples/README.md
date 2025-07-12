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

### Files

- `index.html` - Complete browser demo using the actual library
- `server.ts` - Development server that serves the HTML demo
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