import React from 'react'

interface ControlPanelProps {
  isInitialized: boolean
  isRecording: boolean
  currentSession: any
  participantId: string
  experimentType: string
  onParticipantIdChange: (value: string) => void
  onExperimentTypeChange: (value: string) => void
  onInitialize: () => void
  onCreateSession: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onDownloadJSON: () => void
  onDownloadComponents: () => void
  onDownloadZip: () => void
  onSaveExperiment: () => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isInitialized,
  isRecording,
  currentSession,
  participantId,
  experimentType,
  onParticipantIdChange,
  onExperimentTypeChange,
  onInitialize,
  onCreateSession,
  onStartRecording,
  onStopRecording,
  onDownloadJSON,
  onDownloadComponents,
  onDownloadZip,
  onSaveExperiment
}) => {
  const buttonStyle = {
    padding: '0.75rem 1.5rem',
    margin: '0.5rem',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  }

  const primaryButton = {
    ...buttonStyle,
    backgroundColor: '#007bff',
    color: 'white'
  }

  const successButton = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: 'white'
  }

  const dangerButton = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: 'white'
  }

  const disabledButton = {
    ...buttonStyle,
    backgroundColor: '#6c757d',
    color: 'white',
    cursor: 'not-allowed'
  }

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    margin: '0.25rem 0',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.9rem'
  }

  return (
    <div style={{ padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
      <h3 style={{ marginTop: 0 }}>Control Panel</h3>
      
      {/* Session Configuration */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4>Session Configuration</h4>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Participant ID:
            <input
              type="text"
              value={participantId}
              onChange={(e) => onParticipantIdChange(e.target.value)}
              style={inputStyle}
              disabled={currentSession !== null}
            />
          </label>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Experiment Type:
            <input
              type="text"
              value={experimentType}
              onChange={(e) => onExperimentTypeChange(e.target.value)}
              style={inputStyle}
              disabled={currentSession !== null}
            />
          </label>
        </div>
      </div>

      {/* Recording Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4>Recording Controls</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={onInitialize}
            disabled={isInitialized}
            style={isInitialized ? disabledButton : primaryButton}
          >
            1. Initialize
          </button>
          
          <button
            onClick={onCreateSession}
            disabled={!isInitialized || currentSession !== null}
            style={(!isInitialized || currentSession !== null) ? disabledButton : primaryButton}
          >
            2. Create Session
          </button>
          
          <button
            onClick={onStartRecording}
            disabled={!currentSession || isRecording}
            style={(!currentSession || isRecording) ? disabledButton : successButton}
          >
            3. Start Recording
          </button>
          
          <button
            onClick={onStopRecording}
            disabled={!isRecording}
            style={!isRecording ? disabledButton : dangerButton}
          >
            4. Stop Recording
          </button>
        </div>
      </div>

      {/* Download Options */}
      <div>
        <h4>Download Options</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            onClick={onDownloadJSON}
            disabled={!currentSession}
            style={!currentSession ? disabledButton : primaryButton}
          >
            Download JSON
          </button>
          
          <button
            onClick={onDownloadComponents}
            disabled={!currentSession}
            style={!currentSession ? disabledButton : primaryButton}
          >
            Download Components
          </button>
          
          <button
            onClick={onDownloadZip}
            disabled={!currentSession}
            style={!currentSession ? disabledButton : primaryButton}
          >
            Download ZIP
          </button>
          
          <button
            onClick={onSaveExperiment}
            disabled={!currentSession}
            style={!currentSession ? disabledButton : successButton}
          >
            Auto-save Experiment
          </button>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel