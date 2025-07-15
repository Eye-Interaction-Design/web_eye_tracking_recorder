import type {
  CalibrationResult,
  ExperimentSession,
  GazePoint,
  SessionEvent,
} from "../types"

export interface ExperimentStore {
  currentSession: ExperimentSession | null
  isRecording: boolean
  gazeBuffer: GazePoint[]
  sessionEvents: SessionEvent[]
  onGazeDataCallback?: (gazePoint: GazePoint) => void
  onSessionEventCallback?: (event: SessionEvent) => void
  onCalibrationCallback?: (result: CalibrationResult) => void
}

let store: ExperimentStore = {
  currentSession: null,
  isRecording: false,
  gazeBuffer: [],
  sessionEvents: [],
  onGazeDataCallback: undefined,
  onSessionEventCallback: undefined,
  onCalibrationCallback: undefined,
}

export const getStore = (): ExperimentStore => store

export const updateStore = (updates: Partial<ExperimentStore>): void => {
  store = { ...store, ...updates }
}

export const resetStore = (): void => {
  store = {
    currentSession: null,
    isRecording: false,
    gazeBuffer: [],
    sessionEvents: [],
    onGazeDataCallback: undefined,
    onSessionEventCallback: undefined,
    onCalibrationCallback: undefined,
  }
}

export const addToGazeBuffer = (gazePoint: GazePoint): void => {
  store.gazeBuffer.push(gazePoint)
}

export const clearGazeBuffer = (): GazePoint[] => {
  const buffer = [...store.gazeBuffer]
  store.gazeBuffer = []
  return buffer
}

export const addSessionEvent = (event: SessionEvent): void => {
  store.sessionEvents.push(event)
  store.onSessionEventCallback?.(event)
}

export const emitGazeData = (gazePoint: GazePoint): void => {
  store.onGazeDataCallback?.(gazePoint)
}

export const emitCalibrationResult = (result: CalibrationResult): void => {
  store.onCalibrationCallback?.(result)
}
