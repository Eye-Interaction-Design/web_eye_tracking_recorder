import type { GazeDataCallback, SessionEventCallback } from "./experiment"

export const interactionState: {
  onGazeDataCallback?: GazeDataCallback
  onSessionEventCallback?: SessionEventCallback
} = {}
