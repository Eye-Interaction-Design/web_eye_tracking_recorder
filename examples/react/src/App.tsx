import React from 'react'
import { EyeTrackerProvider } from '@web-eye-tracking-recorder/react'
import EyeTrackingDemo from './components/EyeTrackingDemo'

function App() {
  return (
    <EyeTrackerProvider autoInitialize={false}>
      <div className="container">
        <h1>Web Eye Tracking Recorder - React Demo</h1>
        <p>
          This is a comprehensive demo of the Web Eye Tracking Recorder library with React integration.
          The demo includes initialization, session management, gaze data collection, and various export options.
        </p>
        <p>
          <strong>Mock Gaze Data:</strong> This demo uses simulated gaze data based on mouse movements for demonstration purposes.
        </p>
        
        <EyeTrackingDemo />
      </div>
    </EyeTrackerProvider>
  )
}

export default App