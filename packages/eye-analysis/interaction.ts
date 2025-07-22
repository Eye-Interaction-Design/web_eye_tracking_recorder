import type { GazeDataCallback, SessionEventCallback } from "./experiment"

export const interactionState: {
  onGazeDataCallback?: GazeDataCallback
  onSessionEventCallback?: SessionEventCallback
} = {}

// Debug: Global state to ensure singleton behavior
declare global {
  var __eyeAnalysisInteractionState: typeof interactionState
}

if (typeof globalThis !== "undefined") {
  if (!globalThis.__eyeAnalysisInteractionState) {
    globalThis.__eyeAnalysisInteractionState = interactionState
  } else {
    // Use the existing global instance to ensure singleton behavior
    Object.assign(interactionState, globalThis.__eyeAnalysisInteractionState)
  }
}
