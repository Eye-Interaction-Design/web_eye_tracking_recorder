import type { GazeDataCallback, SessionEventCallback } from "./experiment"

// Internal state object
const _interactionState: {
  onGazeDataCallback?: GazeDataCallback
  onSessionEventCallback?: SessionEventCallback
} = {}

// Global state to ensure singleton behavior
declare global {
  var __eyeAnalysisInteractionState: typeof _interactionState
}

// Ensure global singleton
if (typeof globalThis !== "undefined") {
  if (!globalThis.__eyeAnalysisInteractionState) {
    globalThis.__eyeAnalysisInteractionState = _interactionState
  }
}

// Export proxy that always references the global instance
export const interactionState = new Proxy(_interactionState, {
  get(target, prop) {
    const globalState = globalThis.__eyeAnalysisInteractionState || target
    return globalState[prop as keyof typeof globalState]
  },
  set(target, prop, value) {
    const globalState = globalThis.__eyeAnalysisInteractionState || target
    globalState[prop as keyof typeof globalState] = value
    return true
  },
})
