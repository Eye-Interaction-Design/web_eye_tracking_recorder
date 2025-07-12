import React, { useState, useEffect } from 'react'
import { 
  useEyeTracker, 
  useMouseGazeTracking
} from '../../../../packages/react'
import {
  downloadSessionComponents,
  downloadSessionZip,
  saveExperimentData,
  downloadSessionJSON,
  recordTaskInteraction,
  generateTimestamp
} from '../../../shared/demo-logic'
// Simple inline components to avoid circular import issues

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
    const timestamp = generateTimestamp()
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
      await recordTaskInteraction(taskName)
      log(`Task interaction recorded: ${taskName}`)
    } catch (err) {
      log(`Failed to record task interaction: ${err}`)
    }
  }

  const handleDownloadJSON = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session data as JSON...')
      await downloadSessionJSON(currentSession.sessionId)
      log('JSON download completed')
    } catch (err) {
      log(`JSON download failed: ${err}`)
    }
  }

  const handleDownloadComponents = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session components...')
      await downloadSessionComponents(currentSession.sessionId)
      log('Components download completed')
    } catch (err) {
      log(`Components download failed: ${err}`)
    }
  }

  const handleDownloadZip = async () => {
    if (!currentSession) return
    
    try {
      log('Downloading session as ZIP...')
      await downloadSessionZip(currentSession.sessionId)
      log('ZIP download completed')
    } catch (err) {
      log(`ZIP download failed: ${err}`)
    }
  }

  const handleSaveExperiment = async () => {
    if (!currentSession) return
    
    try {
      log('Auto-saving experiment data...')
      await saveExperimentData({
        completedAt: new Date().toISOString(),
        participantId,
        experimentType
      }, currentSession.sessionId)
      log('Experiment data auto-saved successfully')
    } catch (err) {
      log(`Auto-save failed: ${err}`)
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px', backgroundColor: '#f5f5f5' }}>
      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <h1>Web Eye Tracking Recorder - React Demo</h1>
        <p>This is a comprehensive demo of the Web Eye Tracking Recorder library with React integration.</p>
        
        <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '5px', margin: '10px 0', borderLeft: '4px solid #1976d2' }}>
          <strong>📹 Recording Target:</strong> When prompted to share your screen, please select <strong>"This tab"</strong> to record the current demo page.
        </div>
        
        <div style={{ padding: '10px', margin: '10px 0', borderRadius: '5px', fontWeight: 'bold', backgroundColor: '#e3f2fd', color: '#1976d2' }}>
          Status: {isRecording ? 'Recording' : isInitialized ? 'Ready' : 'Not Ready'}
        </div>
        
        {/* Configuration */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', margin: '15px 0', borderRadius: '5px', borderLeft: '4px solid #1976d2' }}>
          <h3>Configuration</h3>
          <p><em>Recording will capture the selected screen source. Please choose "This tab" when prompted.</em></p>
          <div style={{ margin: '10px 0' }}>
            <label style={{ display: 'inline-block', width: '150px', fontWeight: 'bold' }}>
              Participant ID:
              <input
                type="text"
                value={participantId}
                onChange={(e) => setParticipantId(e.target.value)}
                disabled={!!currentSession}
                style={{ padding: '5px', marginLeft: '10px', border: '1px solid #ccc', borderRadius: '3px' }}
              />
            </label>
          </div>
          <div style={{ margin: '10px 0' }}>
            <label style={{ display: 'inline-block', width: '150px', fontWeight: 'bold' }}>
              Experiment Type:
              <select
                value={experimentType}
                onChange={(e) => setExperimentType(e.target.value)}
                disabled={!!currentSession}
                style={{ padding: '5px', marginLeft: '10px', border: '1px solid #ccc', borderRadius: '3px' }}
              >
                <option value="usability-test">Usability Test</option>
                <option value="gaze-tracking">Gaze Tracking</option>
                <option value="interaction-study">Interaction Study</option>
              </select>
            </label>
          </div>
        </div>

        {/* Control Buttons */}
        <div style={{ margin: '15px 0' }}>
          <button
            onClick={handleInitialize}
            disabled={isInitialized}
            style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', margin: '5px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
          >
            Initialize
          </button>
          <button
            onClick={handleCreateSession}
            disabled={!isInitialized || !!currentSession}
            style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', margin: '5px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
          >
            Create Session
          </button>
          <button
            onClick={handleStartRecording}
            disabled={!currentSession || isRecording}
            style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', margin: '5px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
          >
            Start Recording
          </button>
          <button
            onClick={handleStopRecording}
            disabled={!isRecording}
            style={{ backgroundColor: '#d32f2f', color: 'white', border: 'none', padding: '12px 24px', margin: '5px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
          >
            Stop Recording
          </button>
        </div>

        {/* Download Options */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', margin: '15px 0', borderRadius: '5px', borderLeft: '4px solid #1976d2' }}>
          <h3>Download Options</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <button
              onClick={handleDownloadJSON}
              disabled={!currentSession}
              style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
            >
              Download JSON Only
            </button>
            <button
              onClick={handleDownloadComponents}
              disabled={!currentSession}
              style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
            >
              Download Components
            </button>
            <button
              onClick={handleDownloadZip}
              disabled={!currentSession}
              style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
            >
              Download ZIP
            </button>
            <button
              onClick={handleSaveExperiment}
              disabled={!currentSession}
              style={{ backgroundColor: '#1976d2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
            >
              Auto Save
            </button>
          </div>
        </div>
        
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', margin: '15px 0' }}>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Duration</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>{gazeDataCount}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Gaze Points</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>{eventsCount}</div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Events</div>
          </div>
          <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
              {isRecording ? 'Recording' : 'Idle'}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Recording</div>
          </div>
        </div>

        {/* Demo Area */}
        <div 
          onClick={() => currentSession && handleTaskClick('Demo Area Click')}
          style={{ backgroundColor: '#f0f8ff', padding: '20px', margin: '20px 0', borderRadius: '10px', border: '2px dashed #1976d2', textAlign: 'center', position: 'relative', height: '200px', cursor: 'crosshair' }}
        >
          <h3>Demo Area - Move your mouse to simulate gaze</h3>
          <p>During recording, mouse movements will simulate gaze data points</p>
        </div>

        {/* Latest Gaze Data */}
        <div>
          <h3>Latest Gaze Data:</h3>
          <div style={{ backgroundColor: '#e8f5e8', padding: '10px', margin: '10px 0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '12px' }}>
            {gazeDataCount > 0 ? `Collecting gaze data... (${gazeDataCount} points)` : 'No gaze data yet...'}
          </div>
        </div>
        
        {/* System Log */}
        <div>
          <h3>System Log:</h3>
          <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', padding: '15px', margin: '15px 0', borderRadius: '5px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '300px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {logs.map((logEntry, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                {logEntry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EyeTrackingDemo