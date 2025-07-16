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
      id: "gaze-1",
      sessionId: "session123",
      systemTimestamp: 1234567890123,
      browserTimestamp: 123.456,
      screenX: 800,
      screenY: 400,
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
      data: { test: "data" },
    },
    {
      id: "event2",
      sessionId: "session123",
      type: "user_event",
      timestamp: 1234567890500,
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
    },
  }

  describe("gazeDataToCSV", () => {
    it("should generate correct CSV headers", () => {
      const csv = gazeDataToCSV(mockGazeData)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")

      expect(headers).toContain("systemTimestamp")
      expect(headers).toContain("browserTimestamp")
      expect(headers).toContain("screenX")
      expect(headers).toContain("screenY")
      expect(headers).toContain("contentX")
      expect(headers).toContain("contentY")
      expect(headers).toContain("confidence")
      expect(headers).toContain("leftEye - screenX")
      expect(headers).toContain("leftEye - positionX")
      expect(headers).toContain("rightEye - pupilSize")
      expect(headers).toContain("windowState - innerWidth")
      expect(headers).toContain("windowState - screenX")
    })

    it("should generate correct CSV data rows", () => {
      const csv = gazeDataToCSV(mockGazeData)
      const lines = csv.split("\n")
      const dataRow = lines[1]?.split(",")

      expect(dataRow[0]).toBe("1234567890123") // systemTimestamp
      expect(dataRow[1]).toBe("123.456") // browserTimestamp
      expect(dataRow[2]).toBe("800") // screenX
      expect(dataRow[3]).toBe("400") // screenY
      expect(dataRow[4]).toBe("500") // contentX
      expect(dataRow[5]).toBe("300") // contentY
      expect(dataRow[6]).toBe("0.95") // confidence
      expect(dataRow[14]).toBe("3.2") // leftEye pupilSize
      expect(dataRow[15]).toBe("0.1") // leftEye rotateX
      expect(dataRow[16]).toBe("0.2") // leftEye rotateY
      expect(dataRow[17]).toBe("0.3") // leftEye rotateZ
      expect(dataRow[25]).toBe("3") // rightEye pupilSize
      expect(dataRow[26]).toBe("0.15") // rightEye rotateX
      expect(dataRow[27]).toBe("0.25") // rightEye rotateY
      expect(dataRow[28]).toBe("0.35") // rightEye rotateZ
    })

    it("should handle empty optional fields", () => {
      const gazeDataWithMissingFields: GazePoint[] = [
        {
          ...mockGazeData[0],
          leftEye: {
            screenX: mockGazeData[0]?.leftEye.screenX,
            screenY: mockGazeData[0]?.leftEye.screenY,
            contentX: mockGazeData[0]?.leftEye.contentX,
            contentY: mockGazeData[0]?.leftEye.contentY,
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

      const csv = gazeDataToCSV(gazeDataWithMissingFields)
      const lines = csv.split("\n")
      const dataRow = lines[1]?.split(",")

      expect(dataRow[11]).toBe("") // positionX should be empty
      expect(dataRow[12]).toBe("") // positionY should be empty
      expect(dataRow[13]).toBe("") // positionZ should be empty
      expect(dataRow[14]).toBe("") // pupilSize should be empty
      expect(dataRow[15]).toBe("") // rotateX should be empty
      expect(dataRow[16]).toBe("") // rotateY should be empty
      expect(dataRow[17]).toBe("") // rotateZ should be empty
    })

    it("should handle empty gaze data array", () => {
      const csv = gazeDataToCSV([])
      const lines = csv.split("\n")

      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0] || "").toContain("systemTimestamp")
    })
  })

  describe("eventsToCSV", () => {
    it("should generate correct CSV headers for events", () => {
      const csv = eventsToCSV(mockEvents)
      const lines = csv.split("\n")
      const headers = lines[0]?.split(",")

      expect(headers).toEqual(["id", "sessionId", "type", "timestamp", "data"])
    })

    it("should generate correct CSV data rows for events", () => {
      const csv = eventsToCSV(mockEvents)
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
      const csv = eventsToCSV([])
      const lines = csv.split("\n")

      expect(lines).toHaveLength(1) // Only headers
      expect(lines[0] || "").toBe("id,sessionId,type,timestamp,data")
    })

    it("should properly escape quotes in JSON data", () => {
      const eventsWithQuotes: SessionEvent[] = [
        {
          id: "event1",
          sessionId: "session123",
          type: "user_event",
          timestamp: 1234567890000,
          data: { message: 'Hello "world"' },
        },
      ]

      const csv = eventsToCSV(eventsWithQuotes)
      const lines = csv.split("\n")
      const dataRow = lines[1] || ""

      // Should escape quotes properly
      expect(dataRow).toContain('"{""message"":""Hello \\""world\\""""}"')
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
