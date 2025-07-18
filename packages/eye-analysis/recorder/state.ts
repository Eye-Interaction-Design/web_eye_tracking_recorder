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
})

// Global state and subscribers
let currentState: RecorderState = getInitialState()
const subscribers = new Set<StateSubscriber>()

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
      }

    case "STOP_RECORDING":
      return {
        ...state,
        status: "stopped",
        isRecording: false,
        error: null,
        lastUpdate: Date.now(),
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
export const getState = (): RecorderState => currentState

export const dispatch = (action: RecorderAction): void => {
  const newState = stateReducer(currentState, action)

  if (newState !== currentState) {
    currentState = newState

    // Notify all subscribers
    subscribers.forEach((subscriber) => {
      try {
        subscriber(currentState)
      } catch (error) {
        console.error("State subscriber error:", error)
      }
    })
  }
}

export const subscribe = (subscriber: StateSubscriber): (() => void) => {
  subscribers.add(subscriber)

  // Return unsubscribe function
  return () => {
    subscribers.delete(subscriber)
  }
}

export const getSubscriberCount = (): number => subscribers.size

// Reset state (useful for testing)
export const resetState = (): void => {
  dispatch({ type: "RESET" })
}
