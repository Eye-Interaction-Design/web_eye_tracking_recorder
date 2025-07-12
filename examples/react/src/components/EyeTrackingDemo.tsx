import React, { useState, useEffect } from 'react'
import { 
  useEyeTracker, 
  useMouseGazeTracking,
  downloadSessionComponents,
  downloadSessionAsZip,
  saveExperimentData,
  downloadSessionData
} from '@web-eye-tracking-recorder/react'
import ControlPanel from './ControlPanel'
import StatusPanel from './StatusPanel'
import DemoArea from './DemoArea'
import LogPanel from './LogPanel'

const EyeTrackingDemo: React.FC = () => {
  const {
    isReady,
    isInitialized,
    isRecording,
    currentSession,
    gazeDataCount,
    eventsCount,
    recordingDuration,
    error,
    initialize,
    createSession,
    startRecording,
    stopRecording,
    addEvent
  } = useEyeTracker(false) // Don't auto-initialize

  const { startTracking, stopTracking } = useMouseGazeTracking(true)

  const [logs, setLogs] = useState<string[]>([])
  const [participantId, setParticipantId] = useState('participant-001')
  const [experimentType, setExperimentType] = useState('usability-test')

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    log('React Eye Tracking Demo loaded')
    log('This demo uses mock gaze data generated from mouse movements')
  }, [])

  useEffect(() => {
    if (error) {
      log(`Error: ${error}`)
    }
  }, [error])

  useEffect(() => {
    if (isRecording) {
      startTracking()
      log('Mouse tracking started (simulating gaze data)')
    } else {
      stopTracking()
    }
  }, [isRecording, startTracking, stopTracking])

  const handleInitialize = async () => {
    try {
      log('Initializing recorder...')
      await initialize()
      log('Recorder initialized successfully')
    } catch (err) {
      log(`Initialization failed: ${err}`)
    }
  }

  const handleCreateSession = async () => {
    try {
      log('Creating session...')
      const sessionId = await createSession(
        {
          participantId,
          experimentType
        },
        {
          frameRate: 30,
          quality: 'high',
          videoFormat: 'webm',
          chunkDuration: 5
        }
      )
      log(`Session created: ${sessionId}`)
    } catch (err) {
      log(`Session creation failed: ${err}`)
    }
  }

  const handleStartRecording = async () => {
    try {
      log('Starting recording...')
      await startRecording()
      log('Recording started successfully')
      log('Move your mouse around to generate mock gaze data')
    } catch (err) {
      log(`Recording start failed: ${err}`)
    }
  }

  const handleStopRecording = async () => {
    try {
      log('Stopping recording...')
      await stopRecording()
      log('Recording stopped successfully')
    } catch (err) {
      log(`Recording stop failed: ${err}`)
    }
  }

  const handleTaskClick = async (taskName: string) => {
    if (!currentSession) return
    
    try {
      await addEvent('task_interaction', {
        taskName,
        timestamp: Date.now(),
        elementType: 'button'
      })
      log(`Task interaction recorded: ${taskName}`)
    } catch (err) {
      log(`Failed to record task interaction: ${err}`)
    }
  }

  const handleDownloadJSON = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session data as JSON...')
      await downloadSessionData(currentSession.sessionId)
      log('JSON download completed')
    } catch (err) {
      log(`JSON download failed: ${err}`)
    }
  }

  const handleDownloadComponents = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session components...')
      await downloadSessionComponents(currentSession.sessionId, {
        includeMetadata: true,
        includeGazeData: true,
        includeEvents: true,
        includeVideo: true
      })
      log('Components download completed')
    } catch (err) {
      log(`Components download failed: ${err}`)
    }
  }

  const handleDownloadZip = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session as ZIP...')
      await downloadSessionAsZip(currentSession.sessionId, {
        includeMetadata: true,
        includeGazeData: true,
        includeEvents: true,
        includeVideo: true
      })
      log('ZIP download completed')
    } catch (err) {
      log(`ZIP download failed: ${err}`)
    }
  }

  const handleSaveExperiment = async () => {
    if (!currentSession) return
    
    try {
      log('Auto-saving experiment data...')
      await saveExperimentData(currentSession.sessionId, {
        completedAt: new Date().toISOString(),
        participantId,
        experimentType
      })
      log('Experiment data auto-saved successfully')
    } catch (err) {
      log(`Auto-save failed: ${err}`)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
      <div>
        <ControlPanel
          isInitialized={isInitialized}
          isRecording={isRecording}
          currentSession={currentSession}
          participantId={participantId}
          experimentType={experimentType}
          onParticipantIdChange={setParticipantId}
          onExperimentTypeChange={setExperimentType}
          onInitialize={handleInitialize}
          onCreateSession={handleCreateSession}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onDownloadJSON={handleDownloadJSON}
          onDownloadComponents={handleDownloadComponents}
          onDownloadZip={handleDownloadZip}
          onSaveExperiment={handleSaveExperiment}
        />
        
        <StatusPanel
          isReady={isReady}
          isInitialized={isInitialized}
          isRecording={isRecording}
          currentSession={currentSession}
          gazeDataCount={gazeDataCount}
          eventsCount={eventsCount}
          recordingDuration={recordingDuration}
        />
      </div>
      
      <div>
        <DemoArea onTaskClick={handleTaskClick} />
        <LogPanel logs={logs} />
      </div>
    </div>
  )
}

export default EyeTrackingDemo