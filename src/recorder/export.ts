// Data export utilities for improved data structure

import type { SessionData, GazePoint, SessionEvent } from './types'
import { getSessionData, getVideoChunkData } from './storage'

/**
 * Convert gaze data to CSV format
 */
export const gazeDataToCSV = (gazeData: GazePoint[]): string => {
  const headers = [
    'systemTimestamp',
    'browserTimestamp', 
    'screenX',
    'screenY',
    'windowX',
    'windowY',
    'confidence',
    'leftEye - screenX',
    'leftEye - screenY', 
    'leftEye - windowX',
    'leftEye - windowY',
    'leftEye - positionX',
    'leftEye - positionY',
    'leftEye - positionZ',
    'leftEye - pupilSize',
    'rightEye - screenX',
    'rightEye - screenY',
    'rightEye - windowX', 
    'rightEye - windowY',
    'rightEye - positionX',
    'rightEye - positionY',
    'rightEye - positionZ',
    'rightEye - pupilSize',
    'browserWindow - innerWidth',
    'browserWindow - innerHeight',
    'browserWindow - scrollX',
    'browserWindow - scrollY',
    'browserWindow - devicePixelRatio',
    'browserWindow - screenX',
    'browserWindow - screenY',
    'browserWindow - outerWidth',
    'browserWindow - outerHeight',
    'screen - width',
    'screen - height',
    'screen - availWidth',
    'screen - availHeight'
  ]

  const csvRows = [headers.join(',')]
  
  for (const point of gazeData) {
    const row = [
      point.systemTimestamp,
      point.browserTimestamp,
      point.screenX,
      point.screenY,
      point.windowX,
      point.windowY,
      point.confidence,
      point.leftEye.screenX,
      point.leftEye.screenY,
      point.leftEye.windowX,
      point.leftEye.windowY,
      point.leftEye.positionX || '',
      point.leftEye.positionY || '',
      point.leftEye.positionZ || '',
      point.leftEye.pupilSize || '',
      point.rightEye.screenX,
      point.rightEye.screenY,
      point.rightEye.windowX,
      point.rightEye.windowY,
      point.rightEye.positionX || '',
      point.rightEye.positionY || '',
      point.rightEye.positionZ || '',
      point.rightEye.pupilSize || '',
      point.browserWindow.innerWidth,
      point.browserWindow.innerHeight,
      point.browserWindow.scrollX,
      point.browserWindow.scrollY,
      point.browserWindow.devicePixelRatio,
      point.browserWindow.screenX,
      point.browserWindow.screenY,
      point.browserWindow.outerWidth,
      point.browserWindow.outerHeight,
      point.screen.width,
      point.screen.height,
      point.screen.availWidth,
      point.screen.availHeight
    ]
    csvRows.push(row.join(','))
  }
  
  return csvRows.join('\n')
}

/**
 * Convert events data to CSV format
 */
export const eventsToCSV = (events: SessionEvent[]): string => {
  const headers = ['id', 'sessionId', 'type', 'timestamp', 'data']
  const csvRows = [headers.join(',')]
  
  for (const event of events) {
    const row = [
      event.id,
      event.sessionId,
      event.type,
      event.timestamp,
      event.data ? JSON.stringify(event.data).replace(/"/g, '""') : ''
    ]
    csvRows.push(row.map(field => `"${field}"`).join(','))
  }
  
  return csvRows.join('\n')
}

/**
 * Create metadata JSON (excluding time-series data)
 */
export const createMetadataJSON = (sessionData: SessionData): object => {
  return {
    sessionInfo: sessionData.session,
    metadata: sessionData.metadata,
    videoChunks: sessionData.videoChunks.map(chunk => ({
      ...chunk,
      // Don't include the actual video data in metadata
      note: `Video chunk ${chunk.chunkIndex} - ${chunk.size} bytes`
    })),
    summary: {
      totalGazePoints: sessionData.gazeData.length,
      totalEvents: sessionData.events.length,
      totalVideoChunks: sessionData.videoChunks.length,
      sessionDuration: sessionData.metadata.totalDuration,
      recordingStartTime: new Date(sessionData.session.startTime).toISOString(),
      recordingEndTime: sessionData.session.endTime 
        ? new Date(sessionData.session.endTime).toISOString() 
        : null
    }
  }
}

/**
 * Download a file with given content
 */
export const downloadFile = (content: string | Blob, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download complete session data as multiple files (JSON + CSV + Video)
 */
export const downloadCompleteSessionData = async (sessionId: string): Promise<void> => {
  const sessionData = await getSessionData(sessionId)
  const sessionName = `session-${sessionId}-${new Date().toISOString().split('T')[0]}`
  
  // 1. Download metadata as JSON
  const metadata = createMetadataJSON(sessionData)
  downloadFile(
    JSON.stringify(metadata, null, 2),
    `${sessionName}-metadata.json`,
    'application/json'
  )
  
  // 2. Download gaze data as CSV
  if (sessionData.gazeData.length > 0) {
    const gazeCSV = gazeDataToCSV(sessionData.gazeData)
    downloadFile(gazeCSV, `${sessionName}-gaze-data.csv`, 'text/csv')
  }
  
  // 3. Download events as CSV
  if (sessionData.events.length > 0) {
    const eventsCSV = eventsToCSV(sessionData.events)
    downloadFile(eventsCSV, `${sessionName}-events.csv`, 'text/csv')
  }
  
  // 4. Download video chunks (combined into single webm file)
  if (sessionData.videoChunks.length > 0) {
    try {
      const videoBlobs: Blob[] = []
      
      // Collect all video chunk data
      for (const chunk of sessionData.videoChunks) {
        const chunkData = await getVideoChunkData(chunk.id)
        if (chunkData) {
          videoBlobs.push(chunkData)
        }
      }
      
      // Combine video chunks
      if (videoBlobs.length > 0) {
        const combinedVideo = new Blob(videoBlobs, { type: 'video/webm' })
        downloadFile(combinedVideo, `${sessionName}-recording.webm`, 'video/webm')
      }
    } catch (error) {
      console.error('Failed to download video data:', error)
      // Continue with other downloads even if video fails
    }
  }
}

/**
 * Create a summary report of the session
 */
export const createSessionSummaryText = (sessionData: SessionData): string => {
  const duration = Math.round(sessionData.metadata.totalDuration / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  return `Web Eye Tracking Recorder - Session Summary
==========================================

Session ID: ${sessionData.session.sessionId}
Participant: ${sessionData.session.participantId}
Experiment: ${sessionData.session.experimentType}
Start Time: ${new Date(sessionData.session.startTime).toLocaleString()}
End Time: ${sessionData.session.endTime ? new Date(sessionData.session.endTime).toLocaleString() : 'N/A'}
Duration: ${minutes}m ${seconds}s

Data Summary:
- Gaze Data Points: ${sessionData.gazeData.length}
- Events Recorded: ${sessionData.events.length}
- Video Chunks: ${sessionData.videoChunks.length}

Recording Settings:
- Frame Rate: ${sessionData.session.config.frameRate} fps
- Quality: ${sessionData.session.config.quality}
- Chunk Duration: ${sessionData.session.config.chunkDuration}s

Export Date: ${new Date().toLocaleString()}
Generated by Web Eye Tracking Recorder
`
}