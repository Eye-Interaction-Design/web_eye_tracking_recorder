// State management with subscriber pattern (React-friendly)

import type { RecorderAction, RecorderState, StateSubscriber } from "./types"

// Initial state
const getInitialState = (): RecorderState => ({
  status: "idle",
  currentSession: null,
  isRecording: false,
  recordingDuration: 0,
  gazeDataCount: 0,
  eventsCount: 0,
  videoChunksCount: 0,
  error: null,
  lastUpdate: Date.now(),
  recordingConfig: undefined,
  startBrowserTime: undefined,
})

// Global state and subscribers with singleton pattern
declare global {
  var __eyeAnalysisRecorderState: RecorderState
  var __eyeAnalysisStateSubscribers: Set<StateSubscriber>
}

const ensureGlobalState = () => {
  if (!globalThis.__eyeAnalysisRecorderState) {
    globalThis.__eyeAnalysisRecorderState = getInitialState()
  }
  if (!globalThis.__eyeAnalysisStateSubscribers) {
    globalThis.__eyeAnalysisStateSubscribers = new Set<StateSubscriber>()
  }
}

ensureGlobalState()

const getCurrentState = (): RecorderState => {
  ensureGlobalState()
  return globalThis.__eyeAnalysisRecorderState
}

const getSubscribers = (): Set<StateSubscriber> => {
  ensureGlobalState()
  return globalThis.__eyeAnalysisStateSubscribers
}

// State reducer (pure function)
const stateReducer = (
  state: RecorderState,
  action: RecorderAction,
): RecorderState => {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...state,
        status: "initialized",
        error: null,
        lastUpdate: Date.now(),
      }

    case "CREATE_SESSION":
      return {
        ...state,
        currentSession: action.payload,
        error: null,
        lastUpdate: Date.now(),
      }

    case "UPDATE_SESSION":
      return {
        ...state,
        currentSession: action.payload,
        error: null,
        lastUpdate: Date.now(),
      }

    case "START_RECORDING":
      return {
        ...state,
        status: "recording",
        isRecording: true,
        recordingDuration: 0,
        error: null,
        lastUpdate: Date.now(),
        startBrowserTime: performance.now(),
      }

    case "STOP_RECORDING":
      return {
        ...state,
        status: "stopped",
        isRecording: false,
        error: null,
        lastUpdate: Date.now(),
        startBrowserTime: undefined,
      }

    case "ADD_GAZE_DATA":
      return {
        ...state,
        gazeDataCount: state.gazeDataCount + 1,
        lastUpdate: Date.now(),
      }

    case "ADD_EVENT":
      return {
        ...state,
        eventsCount: state.eventsCount + 1,
        lastUpdate: Date.now(),
      }

    case "UPDATE_DURATION":
      return {
        ...state,
        recordingDuration: action.payload,
        lastUpdate: Date.now(),
      }

    case "SET_ERROR":
      return {
        ...state,
        status: "error",
        error: action.payload,
        lastUpdate: Date.now(),
      }

    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
        lastUpdate: Date.now(),
      }

    case "CLEAR_SESSION":
      return {
        ...state,
        status: "initialized", // Reset status to initialized to allow new sessions
        currentSession: null,
        gazeDataCount: 0,
        eventsCount: 0,
        videoChunksCount: 0,
        recordingDuration: 0,
        startBrowserTime: undefined,
        lastUpdate: Date.now(),
      }

    case "SET_RECORDING_CONFIG":
      return {
        ...state,
        recordingConfig: action.payload,
        lastUpdate: Date.now(),
      }

    case "RESET":
      return {
        ...getInitialState(),
        lastUpdate: Date.now(),
      }

    default:
      return state
  }
}

// State management functions
export const getState = (): RecorderState => getCurrentState()

export const dispatch = (action: RecorderAction): void => {
  const currentState = getCurrentState()
  const newState = stateReducer(currentState, action)

  if (newState !== currentState) {
    globalThis.__eyeAnalysisRecorderState = newState

    // Notify all subscribers
    const subscribers = getSubscribers()
    subscribers.forEach((subscriber) => {
      try {
        subscriber(newState)
      } catch (error) {
        console.error("State subscriber error:", error)
      }
    })
  }
}

export const subscribe = (subscriber: StateSubscriber): (() => void) => {
  const subscribers = getSubscribers()
  subscribers.add(subscriber)

  // Return unsubscribe function
  return () => {
    subscribers.delete(subscriber)
  }
}

export const getSubscriberCount = (): number => getSubscribers().size

// Reset state (useful for testing)
export const resetState = (): void => {
  dispatch({ type: "RESET" })
}
