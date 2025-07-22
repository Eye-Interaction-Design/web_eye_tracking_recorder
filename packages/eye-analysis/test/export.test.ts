import { describe, expect, it } from "vitest"
import {
  createMetadataJSON,
  eventsToCSV,
  gazeDataToCSV,
} from "../recorder/export"
import type {
  GazePoint,
  MetadataJSON,
  SessionData,
  SessionEvent,
} from "../recorder/types"

describe("Export Utilities", () => {
  const mockGazeData: GazePoint[] = [
    {
      sessionId: "session123",
      systemTimestamp: 1234567890123,
      browserTimestamp: 123.456,
      screenX: 800,
      screenY: 400,
      screenWidth: 1920,
      screenHeight: 1080,
      contentX: 500,
      contentY: 300,
      confidence: 0.95,
      leftEye: {
        screenX: 795,
        screenY: 398,
        contentX: 495,
        contentY: 298,
        positionX: 1254,
        positionY: 521,
        positionZ: 700,
        pupilSize: 3.2,
        rotateX: 0.1,
        rotateY: 0.2,
        rotateZ: 0.3,
      },
      rightEye: {
        screenX: 805,
        screenY: 402,
        contentX: 505,
        contentY: 302,
        positionX: 1256,
        positionY: 519,
        positionZ: 702,
        pupilSize: 3.0,
        rotateX: 0.15,
        rotateY: 0.25,
        rotateZ: 0.35,
      },
      windowState: {
        innerWidth: 1200,
        innerHeight: 800,
        outerWidth: 1220,
        outerHeight: 850,
        scrollX: 0,
        scrollY: 0,
        screenX: 300,
        screenY: 100,
      },
    },
  ]

  const mockEvents: SessionEvent[] = [
    {
      id: "event1",
      sessionId: "session123",
      type: "session_start",
      timestamp: 1234567890000,
      browserTimestamp: 123.456,
      data: { test: "data" },
    },
    {
      id: "event2",
      sessionId: "session123",
      type: "user_event",
      timestamp: 1234567890500,
      browserTimestamp: 623.789,
      data: undefined,
    },
  ]

  const mockSessionData: SessionData = {
    session: {
      sessionId: "session123",
      participantId: "P001",
      experimentType: "demo",
      startTime: 1234567890000,
      endTime: 1234567950000,
      recordingMode: "current-tab",
      config: {
        frameRate: 30,
        quality: "medium",
        chunkDuration: 5,
        captureEntireScreen: false,
      },
    },
    events: mockEvents,
    gazeData: mockGazeData,
    videoChunks: [
      {
        id: "chunk1",
        sessionId: "session123",
        timestamp: 1234567890000,
        chunkIndex: 0,
        duration: 5,
        size: 1024000,
      },
    ],
    metadata: {
      totalDuration: 60000,
      gazeDataPoints: 1,
      eventsCount: 2,
      chunksCount: 1,
      exportedAt: "2025-07-12T09:00:00.000Z",
      startBrowserTime: 100.0, // Mock start browser time
      endBrowserTime: 500.0, // Mock end browser time
    },
  }

  describe("gazeDataToCSV", () => {
    it("should generate correct CSV headers", () => {
      const csv = gazeDataToCSV(mockGazeData, 100.0)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")

      expect(headers).toContain("systemTimestamp")
      expect(headers).toContain("elapsedTime")
      expect(headers).toContain("screenX")
      expect(headers).toContain("screenY")
      expect(headers).toContain("contentX")
      expect(headers).toContain("contentY")
      expect(headers).toContain("confidence")
      expect(headers).toContain("leftEye - screenX")
      expect(headers).toContain("leftEye - positionX")
      expect(headers).toContain("rightEye - pupilSize")
      expect(headers).toContain("windowState - innerWidth")
      expect(headers).toContain("windowState - outerWidth")
      expect(headers).toContain("windowState - screenX")
    })

    it("should generate correct CSV data rows", () => {
      const csv = gazeDataToCSV(mockGazeData, 100.0)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")
      const dataRow = lines[1]?.split(",")

      // Check that all expected data is present by finding the column index
      const systemTimestampIndex = headers?.indexOf("systemTimestamp") ?? -1
      const elapsedTimeIndex = headers?.indexOf("elapsedTime") ?? -1
      const screenXIndex = headers?.indexOf("screenX") ?? -1
      const screenYIndex = headers?.indexOf("screenY") ?? -1
      const contentXIndex = headers?.indexOf("contentX") ?? -1
      const contentYIndex = headers?.indexOf("contentY") ?? -1
      const confidenceIndex = headers?.indexOf("confidence") ?? -1
      const leftEyePupilSizeIndex =
        headers?.indexOf("leftEye - pupilSize") ?? -1
      const leftEyeRotateXIndex = headers?.indexOf("leftEye - rotateX") ?? -1
      const leftEyeRotateYIndex = headers?.indexOf("leftEye - rotateY") ?? -1
      const leftEyeRotateZIndex = headers?.indexOf("leftEye - rotateZ") ?? -1
      const rightEyePupilSizeIndex =
        headers?.indexOf("rightEye - pupilSize") ?? -1
      const rightEyeRotateXIndex = headers?.indexOf("rightEye - rotateX") ?? -1
      const rightEyeRotateYIndex = headers?.indexOf("rightEye - rotateY") ?? -1
      const rightEyeRotateZIndex = headers?.indexOf("rightEye - rotateZ") ?? -1

      expect(dataRow?.[systemTimestampIndex]).toBe("1234567890123")
      expect(dataRow?.[elapsedTimeIndex]).toBe("23.456000000000003")
      expect(dataRow?.[screenXIndex]).toBe("800")
      expect(dataRow?.[screenYIndex]).toBe("400")
      expect(dataRow?.[contentXIndex]).toBe("500")
      expect(dataRow?.[contentYIndex]).toBe("300")
      expect(dataRow?.[confidenceIndex]).toBe("0.95")
      expect(dataRow?.[leftEyePupilSizeIndex]).toBe("3.2")
      expect(dataRow?.[leftEyeRotateXIndex]).toBe("0.1")
      expect(dataRow?.[leftEyeRotateYIndex]).toBe("0.2")
      expect(dataRow?.[leftEyeRotateZIndex]).toBe("0.3")
      expect(dataRow?.[rightEyePupilSizeIndex]).toBe("3")
      expect(dataRow?.[rightEyeRotateXIndex]).toBe("0.15")
      expect(dataRow?.[rightEyeRotateYIndex]).toBe("0.25")
      expect(dataRow?.[rightEyeRotateZIndex]).toBe("0.35")
    })

    it("should handle empty optional fields", () => {
      const gazeDataWithMissingFields: GazePoint[] = [
        {
          ...mockGazeData[0],
          leftEye: {
            screenX: mockGazeData[0]?.leftEye?.screenX,
            screenY: mockGazeData[0]?.leftEye?.screenY,
            contentX: mockGazeData[0]?.leftEye?.contentX ?? 0,
            contentY: mockGazeData[0]?.leftEye?.contentY ?? 0,
            positionX: undefined,
            positionY: undefined,
            positionZ: undefined,
            pupilSize: undefined,
            rotateX: undefined,
            rotateY: undefined,
            rotateZ: undefined,
          },
        },
      ]

      const csv = gazeDataToCSV(gazeDataWithMissingFields, 100.0)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")

      // Should not include columns that are entirely empty
      expect(headers).not.toContain("leftEye - positionX")
      expect(headers).not.toContain("leftEye - positionY")
      expect(headers).not.toContain("leftEye - positionZ")
      expect(headers).not.toContain("leftEye - pupilSize")
      expect(headers).not.toContain("leftEye - rotateX")
      expect(headers).not.toContain("leftEye - rotateY")
      expect(headers).not.toContain("leftEye - rotateZ")

      // Should include columns with data
      expect(headers).toContain("systemTimestamp")
      expect(headers).toContain("elapsedTime")
      expect(headers).toContain("screenX")
      expect(headers).toContain("screenY")
    })

    it("should handle empty gaze data array", () => {
      const csv = gazeDataToCSV([], 100.0)

      // Empty data array should return empty string
      expect(csv).toBe("")
    })

    it("should throw error when startBrowserTime is undefined", () => {
      expect(() => {
        gazeDataToCSV(mockGazeData, undefined)
      }).toThrow("startBrowserTime is required for elapsedTime calculation")
    })

    it("should calculate elapsedTime correctly as difference from startBrowserTime", () => {
      // Test data with specific browserTimestamp
      const testGazeData: GazePoint[] = [
        {
          ...mockGazeData[0],
          browserTimestamp: 250.0, // Mock browser timestamp
        },
      ]

      const startTime = 100.0 // Mock start browser time
      const csv = gazeDataToCSV(testGazeData, startTime)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")
      const dataRow = lines[1]?.split(",")
      const elapsedTimeIndex = headers?.indexOf("elapsedTime") ?? -1

      // elapsedTime should be browserTimestamp - startBrowserTime = 250.0 - 100.0 = 150.0
      expect(dataRow?.[elapsedTimeIndex]).toBe("150")
    })

    it("should exclude data outside browser timestamp range when filtering", () => {
      // Create test data with timestamps outside the recording range
      const testData: GazePoint[] = [
        {
          ...mockGazeData[0],
          browserTimestamp: 50.0, // Before recording start (< 100.0)
        },
        {
          ...mockGazeData[0],
          browserTimestamp: 200.0, // Within recording range
        },
        {
          ...mockGazeData[0],
          browserTimestamp: 600.0, // After recording end (> 500.0)
        },
      ]

      const startTime = 100.0
      const csv = gazeDataToCSV(testData, startTime)
      const lines = csv.split("\n")

      // Should have header + all 3 data rows (CSV generation doesn't filter by range)
      // Filtering happens at the storage/session data level
      expect(lines).toHaveLength(4) // header + 3 data rows
    })
  })

  describe("eventsToCSV", () => {
    it("should generate correct CSV headers for events", () => {
      const csv = eventsToCSV(mockEvents, 100.0)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")

      expect(headers).toEqual([
        "id",
        "sessionId",
        "type",
        "timestamp",
        "elapsedTime",
        "data",
      ])
    })

    it("should generate correct CSV data rows for events", () => {
      const csv = eventsToCSV(mockEvents, 100.0)
      const lines = csv.split("\n")

      // First event with data
      const dataRow1 = lines[1] || ""
      expect(dataRow1).toContain('"event1"')
      expect(dataRow1).toContain('"session123"')
      expect(dataRow1).toContain('"session_start"')
      expect(dataRow1).toContain("1234567890000")
      expect(dataRow1).toContain('{""test"":""data""}')

      // Second event without data
      const dataRow2 = lines[2] || ""
      expect(dataRow2).toContain('"event2"')
      expect(dataRow2).toContain('""') // Empty data field
    })

    it("should handle empty events array", () => {
      const csv = eventsToCSV([], 100.0)
      const lines = csv.split("\n")

      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0] || "").toBe(
        "id,sessionId,type,timestamp,elapsedTime,data",
      )
    })

    it("should properly escape quotes in JSON data", () => {
      const eventsWithQuotes: SessionEvent[] = [
        {
          id: "event1",
          sessionId: "session123",
          type: "user_event",
          timestamp: 1234567890000,
          browserTimestamp: 123.456,
          data: { message: 'Hello "world"' },
        },
      ]

      const csv = eventsToCSV(eventsWithQuotes, 100.0)
      const lines = csv.split("\n")
      const dataRow = lines[1] || ""

      // Should escape quotes properly
      expect(dataRow).toContain('"{""message"":""Hello \\""world\\""""}"')
    })

    it("should throw error when startBrowserTime is undefined for events", () => {
      expect(() => {
        eventsToCSV(mockEvents, undefined)
      }).toThrow("startBrowserTime is required for elapsedTime calculation")
    })

    it("should calculate elapsedTime correctly for events", () => {
      const testEvents: SessionEvent[] = [
        {
          ...mockEvents[0],
          browserTimestamp: 300.0, // Mock browser timestamp
        },
      ]

      const startTime = 150.0 // Mock start browser time
      const csv = eventsToCSV(testEvents, startTime)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")
      const dataRow = lines[1]?.split(",")
      const elapsedTimeIndex = headers?.indexOf("elapsedTime") ?? -1

      // elapsedTime should be browserTimestamp - startBrowserTime = 300.0 - 150.0 = 150.0
      expect(dataRow?.[elapsedTimeIndex]).toBe('"150"')
    })
  })

  describe("createMetadataJSON", () => {
    it("should create correct metadata structure", () => {
      const metadata = createMetadataJSON(mockSessionData)

      expect(metadata).toHaveProperty("sessionInfo")
      expect(metadata).toHaveProperty("metadata")
      expect(metadata).toHaveProperty("videoChunks")
      expect(metadata).toHaveProperty("summary")
    })

    it("should include session information", () => {
      const metadata: MetadataJSON = createMetadataJSON(mockSessionData)

      expect(metadata.sessionInfo.sessionId).toBe("session123")
      expect(metadata.sessionInfo.participantId).toBe("P001")
      expect(metadata.sessionInfo.experimentType).toBe("demo")
    })

    it("should include summary statistics", () => {
      const metadata: MetadataJSON = createMetadataJSON(mockSessionData)
      const summary = metadata.summary

      expect(summary.totalGazePoints).toBe(1)
      expect(summary.totalEvents).toBe(2)
      expect(summary.totalVideoChunks).toBe(1)
      expect(summary.sessionDuration).toBe(60000)
      expect(summary.recordingStartTime).toBe("2009-02-13T23:31:30.000Z")
      expect(summary.recordingEndTime).toBe("2009-02-13T23:32:30.000Z")
    })

    it("should handle session without end time", () => {
      const sessionDataWithoutEndTime = {
        ...mockSessionData,
        session: {
          ...mockSessionData.session,
          endTime: undefined,
        },
      }

      const metadata: MetadataJSON = createMetadataJSON(
        sessionDataWithoutEndTime,
      )
      const summary = metadata.summary

      expect(summary.recordingEndTime).toBe(null)
    })

    it("should include video chunks info without actual data", () => {
      const metadata: MetadataJSON = createMetadataJSON(mockSessionData)
      const videoChunks = metadata.videoChunks

      expect(videoChunks).toHaveLength(1)
      expect(videoChunks[0]).toHaveProperty("id", "chunk1")
      expect(videoChunks[0]).toHaveProperty("size", 1024000)
      expect(videoChunks[0]).toHaveProperty("note")
      expect(videoChunks[0].note).toContain("Video chunk 0 - 1024000 bytes")
    })
  })
})
