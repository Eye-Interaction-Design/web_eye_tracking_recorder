import { describe, it, expect } from 'vitest'
import { gazeDataToCSV, eventsToCSV, createMetadataJSON } from '../src/recorder/export'
import type { GazePoint, SessionEvent, SessionData } from '../src/recorder/types'

describe('Export Utilities', () => {
  const mockGazeData: GazePoint[] = [
    {
      systemTimestamp: 1234567890123,
      browserTimestamp: 123.456,
      screenX: 800,
      screenY: 400,
      windowX: 500,
      windowY: 300,
      confidence: 0.95,
      leftEye: {
        screenX: 795,
        screenY: 398,
        windowX: 495,
        windowY: 298,
        positionX: 1254,
        positionY: 521,
        positionZ: 700,
        pupilSize: 3.2
      },
      rightEye: {
        screenX: 805,
        screenY: 402,
        windowX: 505,
        windowY: 302,
        positionX: 1256,
        positionY: 519,
        positionZ: 702,
        pupilSize: 3.0
      },
      browserWindow: {
        innerWidth: 1200,
        innerHeight: 800,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1.0,
        screenX: 300,
        screenY: 100,
        outerWidth: 1220,
        outerHeight: 850
      },
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040
      }
    }
  ]

  const mockEvents: SessionEvent[] = [
    {
      id: 'event1',
      sessionId: 'session123',
      type: 'session_start',
      timestamp: 1234567890000,
      data: { test: 'data' }
    },
    {
      id: 'event2',
      sessionId: 'session123',
      type: 'user_event',
      timestamp: 1234567890500,
      data: undefined
    }
  ]

  const mockSessionData: SessionData = {
    session: {
      sessionId: 'session123',
      participantId: 'P001',
      experimentType: 'demo',
      startTime: 1234567890000,
      endTime: 1234567950000,
      config: {
        frameRate: 30,
        quality: 'medium',
        chunkDuration: 5,
        captureEntireScreen: false
      }
    },
    events: mockEvents,
    gazeData: mockGazeData,
    videoChunks: [
      {
        id: 'chunk1',
        sessionId: 'session123',
        timestamp: 1234567890000,
        chunkIndex: 0,
        duration: 5,
        size: 1024000
      }
    ],
    metadata: {
      totalDuration: 60000,
      gazeDataPoints: 1,
      eventsCount: 2,
      chunksCount: 1,
      exportedAt: '2025-07-12T09:00:00.000Z'
    }
  }

  describe('gazeDataToCSV', () => {
    it('should generate correct CSV headers', () => {
      const csv = gazeDataToCSV(mockGazeData)
      const lines = csv.split('\n')
      const headers = lines[0]!.split(',')
      
      expect(headers).toContain('systemTimestamp')
      expect(headers).toContain('browserTimestamp')
      expect(headers).toContain('screenX')
      expect(headers).toContain('screenY')
      expect(headers).toContain('windowX')
      expect(headers).toContain('windowY')
      expect(headers).toContain('confidence')
      expect(headers).toContain('leftEye - screenX')
      expect(headers).toContain('leftEye - positionX')
      expect(headers).toContain('rightEye - pupilSize')
      expect(headers).toContain('browserWindow - innerWidth')
      expect(headers).toContain('screen - width')
    })

    it('should generate correct CSV data rows', () => {
      const csv = gazeDataToCSV(mockGazeData)
      const lines = csv.split('\n')
      const dataRow = lines[1]!.split(',')
      
      expect(dataRow[0]).toBe('1234567890123') // systemTimestamp
      expect(dataRow[1]).toBe('123.456') // browserTimestamp
      expect(dataRow[2]).toBe('800') // screenX
      expect(dataRow[3]).toBe('400') // screenY
      expect(dataRow[6]).toBe('0.95') // confidence
      expect(dataRow[14]).toBe('3.2') // leftEye pupilSize
      expect(dataRow[22]).toBe('3') // rightEye pupilSize
    })

    it('should handle empty optional fields', () => {
      const gazeDataWithMissingFields: GazePoint[] = [{
        ...mockGazeData[0]!,
        leftEye: {
          screenX: mockGazeData[0]!.leftEye.screenX,
          screenY: mockGazeData[0]!.leftEye.screenY,
          windowX: mockGazeData[0]!.leftEye.windowX,
          windowY: mockGazeData[0]!.leftEye.windowY,
          positionX: undefined,
          positionY: undefined,
          positionZ: undefined,
          pupilSize: undefined
        }
      }]
      
      const csv = gazeDataToCSV(gazeDataWithMissingFields)
      const lines = csv.split('\n')
      const dataRow = lines[1]!.split(',')
      
      expect(dataRow[11]).toBe('') // positionX should be empty
      expect(dataRow[12]).toBe('') // positionY should be empty
      expect(dataRow[13]).toBe('') // positionZ should be empty
      expect(dataRow[14]).toBe('') // pupilSize should be empty
    })

    it('should handle empty gaze data array', () => {
      const csv = gazeDataToCSV([])
      const lines = csv.split('\n')
      
      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0]!).toContain('systemTimestamp')
    })
  })

  describe('eventsToCSV', () => {
    it('should generate correct CSV headers for events', () => {
      const csv = eventsToCSV(mockEvents)
      const lines = csv.split('\n')
      const headers = lines[0]!.split(',')
      
      expect(headers).toEqual(['id', 'sessionId', 'type', 'timestamp', 'data'])
    })

    it('should generate correct CSV data rows for events', () => {
      const csv = eventsToCSV(mockEvents)
      const lines = csv.split('\n')
      
      // First event with data
      const dataRow1 = lines[1]!
      expect(dataRow1).toContain('"event1"')
      expect(dataRow1).toContain('"session123"')
      expect(dataRow1).toContain('"session_start"')
      expect(dataRow1).toContain('1234567890000')
      expect(dataRow1).toContain('{""test"":""data""}')
      
      // Second event without data
      const dataRow2 = lines[2]!
      expect(dataRow2).toContain('"event2"')
      expect(dataRow2).toContain('""') // Empty data field
    })

    it('should handle empty events array', () => {
      const csv = eventsToCSV([])
      const lines = csv.split('\n')
      
      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0]!).toBe('id,sessionId,type,timestamp,data')
    })

    it('should properly escape quotes in JSON data', () => {
      const eventsWithQuotes: SessionEvent[] = [{
        id: 'event1',
        sessionId: 'session123',
        type: 'user_event',
        timestamp: 1234567890000,
        data: { message: 'Hello "world"' }
      }]
      
      const csv = eventsToCSV(eventsWithQuotes)
      const lines = csv.split('\n')
      const dataRow = lines[1]!
      
      // Should escape quotes properly
      expect(dataRow).toContain('"{""message"":""Hello \\""world\\""""}"')
    })
  })

  describe('createMetadataJSON', () => {
    it('should create correct metadata structure', () => {
      const metadata = createMetadataJSON(mockSessionData)
      
      expect(metadata).toHaveProperty('sessionInfo')
      expect(metadata).toHaveProperty('metadata')
      expect(metadata).toHaveProperty('videoChunks')
      expect(metadata).toHaveProperty('summary')
    })

    it('should include session information', () => {
      const metadata = createMetadataJSON(mockSessionData)
      
      expect((metadata as any).sessionInfo.sessionId).toBe('session123')
      expect((metadata as any).sessionInfo.participantId).toBe('P001')
      expect((metadata as any).sessionInfo.experimentType).toBe('demo')
    })

    it('should include summary statistics', () => {
      const metadata = createMetadataJSON(mockSessionData)
      const summary = (metadata as any).summary
      
      expect(summary.totalGazePoints).toBe(1)
      expect(summary.totalEvents).toBe(2)
      expect(summary.totalVideoChunks).toBe(1)
      expect(summary.sessionDuration).toBe(60000)
      expect(summary.recordingStartTime).toBe('2009-02-13T23:31:30.000Z')
      expect(summary.recordingEndTime).toBe('2009-02-13T23:32:30.000Z')
    })

    it('should handle session without end time', () => {
      const sessionDataWithoutEndTime = {
        ...mockSessionData,
        session: {
          ...mockSessionData.session,
          endTime: undefined
        }
      }
      
      const metadata = createMetadataJSON(sessionDataWithoutEndTime)
      const summary = (metadata as any).summary
      
      expect(summary.recordingEndTime).toBe(null)
    })

    it('should include video chunks info without actual data', () => {
      const metadata = createMetadataJSON(mockSessionData)
      const videoChunks = (metadata as any).videoChunks
      
      expect(videoChunks).toHaveLength(1)
      expect(videoChunks[0]).toHaveProperty('id', 'chunk1')
      expect(videoChunks[0]).toHaveProperty('size', 1024000)
      expect(videoChunks[0]).toHaveProperty('note')
      expect(videoChunks[0].note).toContain('Video chunk 0 - 1024000 bytes')
    })
  })
})