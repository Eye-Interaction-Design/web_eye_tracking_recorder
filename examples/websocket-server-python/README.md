# Tobii Pro Eye Tracking Server

This example provides a WebSocket server that connects to Tobii Pro eye trackers and streams gaze data in the format compatible with the Eye Analysis library.

## Features

- Real-time gaze data streaming via WebSocket
- Compatible with Eye Analysis `GazePointInput` format
- Individual left/right eye gaze coordinates
- 3D eye position data (when available)
- Calibration API endpoints
- Configurable screen resolution and settings

## Data Format

The server sends gaze data in the following format compatible with `GazePointInput`:

### Field Descriptions

- `deviceTimeStamp`: Tobii device timestamp (integer, microseconds)
- `systemTimestamp`: System timestamp (integer, milliseconds)
- `normalized`: Whether coordinates are normalized (0-1) from the device
- `screenX/screenY`: Screen pixel coordinates (converted from normalized)
- `confidence`: Tracking confidence level (0.0-1.0)
- `leftEye/rightEye`: Individual eye data including:
  - `screenX/screenY`: Eye-specific screen coordinates
  - `positionX/Y/Z`: 3D eye position in user coordinate system
  - `pupilSize`: Pupil diameter in millimeters

```json
{
  "deviceTimeStamp": 15994364571,
  "systemTimestamp": 1407513080712,
  "normalized": true,
  "screenX": 960,
  "screenY": 540,
  "confidence": 0.8,
  "leftEye": {
    "screenX": 955,
    "screenY": 540,
    "positionX": 0.123,
    "positionY": 0.456,
    "positionZ": 0.789,
    "pupilSize": 3.037
  },
  "rightEye": {
    "screenX": 965,
    "screenY": 540,
    "positionX": 0.987,
    "positionY": 0.654,
    "positionZ": 0.321,
    "pupilSize": 3.078
  }
}
```

## Configuration

Edit `src/config.py` to adjust:

- `SCREEN_WIDTH` and `SCREEN_HEIGHT`: Your screen resolution
- `DEFAULT_CONFIDENCE`: Default confidence level for gaze data
- `DEFAULT_PUPIL_SIZE`: Default pupil size in mm
- `CALIBRATION_POINTS`: Calibration point coordinates (normalized 0-1)

## Usage with Eye Analysis

```javascript
import { connectTrackingAdaptor, websocketTrackingAdaptor } from 'eye-analysis/tracking/adaptors'

const adaptor = websocketTrackingAdaptor('ws://localhost:8000/eye_tracking')
await connectTrackingAdaptor(adaptor)
```

## API Endpoints

- `ws://localhost:8000/eye_tracking` - WebSocket endpoint for gaze data
- `POST /calibration:start` - Start calibration mode
- `POST /calibration:collect` - Collect calibration data for a point
- `POST /calibration:result` - Compute and apply calibration

## Setup

### For Apple Silicon Macs

The official Tobii Pro SDK used in this app currently does not support Apple Silicon Macs ([ref](https://developer.tobiipro.com/tobiiprosdk/platform-and-language.html)).

First, follow the steps below to install the Intel (Rosetta 2) version of Python (Japanese only):  
[https://zenn.dev/shikibu9419/articles/36e3d37460efa0](https://zenn.dev/shikibu9419/articles/36e3d37460efa0)

```shell
# after installing drivers for Intel macOS
> export UV_PYTHON=<path to the installed Python>
> uv sync
```

### Installation

1. Install Tobii Pro Eye Tracker Manager
2. Install drivers from the Tobii Pro Eye Tracker Manager
3. Run the following:

```shell
> uv run uvicorn src.app:app --reload
```

The server will start on `http://localhost:8000` and automatically connect to available Tobii Pro eye trackers.
