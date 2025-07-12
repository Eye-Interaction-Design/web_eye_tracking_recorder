// Shared demo logic for eye tracking examples

import {
  initialize,
  createSession,
  startRecording,
  stopRecording,
  addGazeData,
  addEvent,
  downloadSessionData,
  downloadSessionComponents as coreDownloadSessionComponents,
  downloadSessionAsZip,
  saveExperimentData as coreSaveExperimentData,
  subscribe,
  getCurrentState,
  getCurrentSession,
  type SessionConfig,
  type RecordingConfig
} from '../../src/index'

// Types
export interface DemoState {
  isInitialized: boolean
  isRecording: boolean
  currentSession: any
  gazeDataCount: number
  eventsCount: number
  recordingDuration: number
  error: string | null
}

export interface DemoConfig {
  participantId: string
  experimentType: string
  recordingConfig?: RecordingConfig
}

export interface MouseTrackingState {
  isActive: boolean
  cleanup: (() => void) | null
}

// State management
const mouseTrackingState: MouseTrackingState = {
  isActive: false,
  cleanup: null
}

// State utilities
export function getCurrentDemoState(): DemoState {
  const coreState = getCurrentState()
  return {
    isInitialized: coreState.status === 'initialized' || coreState.status === 'recording' || coreState.status === 'stopped',
    isRecording: coreState.isRecording,
    currentSession: coreState.currentSession,
    gazeDataCount: coreState.gazeDataCount,
    eventsCount: coreState.eventsCount,
    recordingDuration: coreState.recordingDuration,
    error: coreState.error
  }
}

export function subscribeToDemoState(callback: (state: DemoState) => void): () => void {
  return subscribe((coreState) => {
    callback({
      isInitialized: coreState.status === 'initialized' || coreState.status === 'recording' || coreState.status === 'stopped',
      isRecording: coreState.isRecording,
      currentSession: coreState.currentSession,
      gazeDataCount: coreState.gazeDataCount,
      eventsCount: coreState.eventsCount,
      recordingDuration: coreState.recordingDuration,
      error: coreState.error
    })
  })
}

// Core operations
export async function initializeRecorder(): Promise<void> {
  await initialize()
}

export async function createNewSession(config: DemoConfig): Promise<string> {
  const sessionConfig: SessionConfig = {
    participantId: config.participantId,
    experimentType: config.experimentType
  }

  const recordingConfig: RecordingConfig = {
    frameRate: 30,
    quality: 'high',
    videoFormat: 'webm',
    chunkDuration: 5,
    ...config.recordingConfig
  }

  return await createSession(sessionConfig, recordingConfig)
}

export async function startRecordingSession(): Promise<void> {
  await startRecording()
  startMouseTracking()
}

export async function stopRecordingSession(): Promise<void> {
  stopMouseTracking()
  await stopRecording()
}

// Mouse tracking for demo gaze data
export function startMouseTracking(): void {
  if (mouseTrackingState.isActive) return

  mouseTrackingState.isActive = true
  
  const handleMouseMove = (event: MouseEvent) => {
    if (!mouseTrackingState.isActive) return

    // Generate simulated gaze data from mouse position
    const gazePoint = {
      screenX: event.screenX,
      screenY: event.screenY,
      confidence: 0.8 + Math.random() * 0.2, // Simulated confidence
      leftEye: {
        screenX: event.screenX - 2 + Math.random() * 2,
        screenY: event.screenY + Math.random() * 2,
        pupilSize: 3 + Math.random() * 2
      },
      rightEye: {
        screenX: event.screenX + 2 + Math.random() * 2,
        screenY: event.screenY + Math.random() * 2,
        pupilSize: 3 + Math.random() * 2
      }
    }

    addGazeData(gazePoint).catch(console.error)
  }

  document.addEventListener('mousemove', handleMouseMove)
  
  // Store cleanup function
  mouseTrackingState.cleanup = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    mouseTrackingState.cleanup = null
  }
}

export function stopMouseTracking(): void {
  mouseTrackingState.isActive = false
  if (mouseTrackingState.cleanup) {
    mouseTrackingState.cleanup()
  }
}

export function isMouseTrackingActive(): boolean {
  return mouseTrackingState.isActive
}

// Event recording
export async function recordTaskInteraction(taskName: string, elementType: string = 'button'): Promise<void> {
  await addEvent('task_interaction', {
    taskName,
    elementType,
    timestamp: Date.now()
  })
}

// Download operations
export async function downloadSessionJSON(sessionId?: string): Promise<void> {
  const targetSessionId = sessionId || getCurrentSession()?.sessionId
  if (!targetSessionId) throw new Error('No session available')
  
  await downloadSessionData(targetSessionId)
}

export async function downloadSessionComponents(sessionId?: string): Promise<void> {
  const targetSessionId = sessionId || getCurrentSession()?.sessionId
  if (!targetSessionId) throw new Error('No session available')
  
  await coreDownloadSessionComponents(targetSessionId, {
    includeMetadata: true,
    includeGazeData: true,
    includeEvents: true,
    includeVideo: true
  })
}

export async function downloadSessionZip(sessionId?: string): Promise<void> {
  const targetSessionId = sessionId || getCurrentSession()?.sessionId
  if (!targetSessionId) throw new Error('No session available')
  
  await downloadSessionAsZip(targetSessionId, {
    includeMetadata: true,
    includeGazeData: true,
    includeEvents: true,
    includeVideo: true
  })
}

export async function saveExperimentData(experimentMetadata?: Record<string, any>, sessionId?: string): Promise<void> {
  const targetSessionId = sessionId || getCurrentSession()?.sessionId
  if (!targetSessionId) throw new Error('No session available')
  
  await coreSaveExperimentData(targetSessionId, {
    completedAt: new Date().toISOString(),
    ...experimentMetadata
  })
}

// Utility functions
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function generateTimestamp(): string {
  return new Date().toLocaleTimeString()
}

