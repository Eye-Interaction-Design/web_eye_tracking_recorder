// Data export utilities for improved data structure

import { strToU8, zipSync } from "fflate"
import { getSessionData, getVideoChunkData } from "./storage"
import type {
  GazePoint,
  MetadataJSON,
  SessionData,
  SessionEvent,
} from "./types"

/**
 * Type-safe field extractor interface
 */
interface FieldExtractor<T = unknown> {
  header: string
  getValue: (point: GazePoint) => T | null | undefined
}

/**
 * Type-safe field extractors for all GazePoint fields
 */
const fieldExtractors: FieldExtractor[] = [
  { header: "sessionId", getValue: (p) => p.sessionId },
  { header: "deviceTimeStamp", getValue: (p) => p.deviceTimeStamp },
  { header: "systemTimestamp", getValue: (p) => p.systemTimestamp },
  { header: "browserTimestamp", getValue: (p) => p.browserTimestamp },
  { header: "screenX", getValue: (p) => p.screenX },
  { header: "screenY", getValue: (p) => p.screenY },
  { header: "screenWidth", getValue: (p) => p.screenWidth },
  { header: "screenHeight", getValue: (p) => p.screenHeight },
  { header: "normalized", getValue: (p) => p.normalized },
  { header: "contentX", getValue: (p) => p.contentX },
  { header: "contentY", getValue: (p) => p.contentY },
  { header: "confidence", getValue: (p) => p.confidence },

  // Left eye fields (optional)
  { header: "leftEye - screenX", getValue: (p) => p.leftEye?.screenX },
  { header: "leftEye - screenY", getValue: (p) => p.leftEye?.screenY },
  { header: "leftEye - contentX", getValue: (p) => p.leftEye?.contentX },
  { header: "leftEye - contentY", getValue: (p) => p.leftEye?.contentY },
  { header: "leftEye - positionX", getValue: (p) => p.leftEye?.positionX },
  { header: "leftEye - positionY", getValue: (p) => p.leftEye?.positionY },
  { header: "leftEye - positionZ", getValue: (p) => p.leftEye?.positionZ },
  { header: "leftEye - pupilSize", getValue: (p) => p.leftEye?.pupilSize },
  { header: "leftEye - rotateX", getValue: (p) => p.leftEye?.rotateX },
  { header: "leftEye - rotateY", getValue: (p) => p.leftEye?.rotateY },
  { header: "leftEye - rotateZ", getValue: (p) => p.leftEye?.rotateZ },

  // Right eye fields (optional)
  { header: "rightEye - screenX", getValue: (p) => p.rightEye?.screenX },
  { header: "rightEye - screenY", getValue: (p) => p.rightEye?.screenY },
  { header: "rightEye - contentX", getValue: (p) => p.rightEye?.contentX },
  { header: "rightEye - contentY", getValue: (p) => p.rightEye?.contentY },
  { header: "rightEye - positionX", getValue: (p) => p.rightEye?.positionX },
  { header: "rightEye - positionY", getValue: (p) => p.rightEye?.positionY },
  { header: "rightEye - positionZ", getValue: (p) => p.rightEye?.positionZ },
  { header: "rightEye - pupilSize", getValue: (p) => p.rightEye?.pupilSize },
  { header: "rightEye - rotateX", getValue: (p) => p.rightEye?.rotateX },
  { header: "rightEye - rotateY", getValue: (p) => p.rightEye?.rotateY },
  { header: "rightEye - rotateZ", getValue: (p) => p.rightEye?.rotateZ },

  // Window state fields (optional)
  { header: "windowState - screenX", getValue: (p) => p.windowState?.screenX },
  { header: "windowState - screenY", getValue: (p) => p.windowState?.screenY },
  {
    header: "windowState - innerWidth",
    getValue: (p) => p.windowState?.innerWidth,
  },
  {
    header: "windowState - innerHeight",
    getValue: (p) => p.windowState?.innerHeight,
  },
  {
    header: "windowState - outerWidth",
    getValue: (p) => p.windowState?.outerWidth,
  },
  {
    header: "windowState - outerHeight",
    getValue: (p) => p.windowState?.outerHeight,
  },
  { header: "windowState - scrollX", getValue: (p) => p.windowState?.scrollX },
  { header: "windowState - scrollY", getValue: (p) => p.windowState?.scrollY },
]

/**
 * Enhanced field extractors with relative time calculation
 */
const createFieldExtractors = (startBrowserTime?: number): FieldExtractor[] => [
  ...fieldExtractors,
  // Relative browser timestamp (if startBrowserTime is available)
  {
    header: "relativeBrowserTimestamp",
    getValue: (p) =>
      startBrowserTime && p.browserTimestamp
        ? p.browserTimestamp - startBrowserTime
        : undefined,
  },
]

/**
 * Convert gaze data to CSV format
 * Automatically removes columns that contain only undefined/null values
 */
export const gazeDataToCSV = (
  gazeData: GazePoint[],
  startBrowserTime?: number,
): string => {
  if (gazeData.length === 0) {
    return ""
  }

  // Use enhanced field extractors with relative timestamp
  const extractors = createFieldExtractors(startBrowserTime)

  // Filter to only extractors that have data in at least one row
  const activeExtractors = extractors.filter((extractor) =>
    gazeData.some((point) => {
      const value = extractor.getValue(point)
      return value !== null && value !== undefined
    }),
  )

  // Generate CSV rows
  const headers = activeExtractors.map((extractor) => extractor.header)
  const csvRows = [headers.join(",")]

  for (const point of gazeData) {
    const row = activeExtractors.map((extractor) => {
      const value = extractor.getValue(point)
      return value ?? ""
    })
    csvRows.push(row.join(","))
  }

  return csvRows.join("\n")
}

/**
 * Convert events data to CSV format
 */
export const eventsToCSV = (events: SessionEvent[]): string => {
  const headers = ["id", "sessionId", "type", "timestamp", "data"]
  const csvRows = [headers.join(",")]

  for (const event of events) {
    const row = [
      event.id,
      event.sessionId,
      event.type,
      event.timestamp,
      event.data ? JSON.stringify(event.data).replace(/"/g, '""') : "",
    ]
    csvRows.push(row.map((field) => `"${field}"`).join(","))
  }

  return csvRows.join("\n")
}

/**
 * Create metadata JSON (excluding time-series data)
 */
export const createMetadataJSON = (sessionData: SessionData): MetadataJSON => {
  return {
    sessionInfo: sessionData.session,
    metadata: sessionData.metadata,
    videoChunks: sessionData.videoChunks.map((chunk) => ({
      ...chunk,
      // Don't include the actual video data in metadata
      note: `Video chunk ${chunk.chunkIndex} - ${chunk.size} bytes`,
    })),
    summary: {
      totalGazePoints: sessionData.gazeData.length,
      totalEvents: sessionData.events.length,
      totalVideoChunks: sessionData.videoChunks.length,
      sessionDuration: sessionData.metadata.totalDuration,
      recordingStartTime: new Date(sessionData.session.startTime).toISOString(),
      recordingEndTime: sessionData.session.endTime
        ? new Date(sessionData.session.endTime).toISOString()
        : null,
      // Browser timestamp synchronization info
      startBrowserTime: sessionData.metadata.startBrowserTime,
      endBrowserTime: sessionData.metadata.endBrowserTime,
      browserTimestampNote: sessionData.metadata.startBrowserTime
        ? "relativeBrowserTimestamp = browserTimestamp - startBrowserTime"
        : "Browser timestamp synchronization not available",
    },
  }
}

/**
 * Download a file with given content
 */
export const downloadFile = (
  content: string | Blob,
  filename: string,
  mimeType: string = "text/plain",
): void => {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export all session data for research purposes
 */
export const exportExperimentDataset = async (
  sessionIds: string[],
  options: DownloadSessionOptions = {},
): Promise<void> => {
  const allFiles: Record<string, Uint8Array> = {}

  // Default include options
  const includeOptions = {
    metadata: true,
    gaze: true,
    events: true,
    video: true,
    ...options.include,
  }

  for (const sessionId of sessionIds) {
    try {
      const sessionFolder = `session_${sessionId}`
      const filesToDownload = await collectSessionFiles(sessionId, {
        includeOptions,
        prefix: sessionFolder,
      })

      // Add files to the ZIP with session folder prefix
      for (const file of filesToDownload) {
        if (file.content instanceof Blob) {
          allFiles[file.filename] = new Uint8Array(
            await file.content.arrayBuffer(),
          )
        } else {
          allFiles[file.filename] = strToU8(file.content)
        }
      }
    } catch (error) {
      console.error(`Failed to process session ${sessionId}:`, error)
      // Continue with next session instead of stopping
    }
  }

  // Create combined dataset summary
  const datasetSummary = {
    exportedAt: new Date().toISOString(),
    totalSessions: sessionIds.length,
    sessionIds: sessionIds,
    description: "Combined dataset from Eye Analysis",
    includeOptions: includeOptions,
  }
  allFiles["dataset-summary.json"] = strToU8(
    JSON.stringify(datasetSummary, null, 2),
  )

  // Create ZIP
  const zipped = zipSync(allFiles)
  const zipBlob = new Blob([zipped], { type: "application/zip" })

  const filename = `experiment-dataset-${new Date().toISOString().split("T")[0]}.zip`
  downloadFile(zipBlob, filename, "application/zip")
}

/**
 * Download session options interface
 */
export interface DownloadSessionOptions {
  include?: {
    metadata?: boolean
    gaze?: boolean
    events?: boolean
    video?: boolean
  }
  asZip?: boolean
  prefix?: string
}

/**
 * Generate session name for files
 */
const getSessionName = (sessionId: string): string => {
  return `session-${sessionId}-${new Date().toISOString().split("T")[0]}`
}

/**
 * Shared function to collect files for download with optional prefix
 */
const collectSessionFiles = async (
  sessionId: string,
  options: {
    includeOptions: {
      metadata: boolean
      gaze: boolean
      events: boolean
      video: boolean
    }
    prefix?: string
  },
): Promise<
  Array<{
    content: string | Blob
    filename: string
    mimeType: string
  }>
> => {
  let sessionData: SessionData
  try {
    sessionData = await getSessionData(sessionId)
  } catch (error) {
    console.error(`Failed to get session data for ${sessionId}:`, error)
    throw error
  }
  const sessionName = getSessionName(sessionId)
  const filesToDownload: Array<{
    content: string | Blob
    filename: string
    mimeType: string
  }> = []

  const getFilename = (baseName: string) => {
    if (options.prefix) {
      return `${options.prefix}/${baseName}`
    }
    return `${sessionName}-${baseName}`
  }

  // Add metadata if requested
  if (options.includeOptions.metadata) {
    const metadata = createMetadataJSON(sessionData)
    filesToDownload.push({
      content: JSON.stringify(metadata, null, 2),
      filename: getFilename("metadata.json"),
      mimeType: "application/json",
    })
  }

  // Add gaze data if requested and available
  if (options.includeOptions.gaze && sessionData.gazeData.length > 0) {
    const gazeDataCSV = gazeDataToCSV(
      sessionData.gazeData,
      sessionData.metadata.startBrowserTime,
    )
    filesToDownload.push({
      content: gazeDataCSV,
      filename: getFilename("gaze.csv"),
      mimeType: "text/csv",
    })
  }

  // Add events if requested and available
  if (options.includeOptions.events && sessionData.events.length > 0) {
    const eventsCSV = eventsToCSV(sessionData.events)
    filesToDownload.push({
      content: eventsCSV,
      filename: getFilename("events.csv"),
      mimeType: "text/csv",
    })
  }

  // Add video if requested and available
  if (options.includeOptions.video && sessionData.videoChunks.length > 0) {
    try {
      const videoBlobs: Blob[] = []
      let videoFormat = "webm" // Default format

      for (const chunk of sessionData.videoChunks) {
        const chunkData = await getVideoChunkData(chunk.id)
        if (chunkData) {
          videoBlobs.push(chunkData)
          // Detect format from the actual blob
          if (chunkData.type.includes("mp4")) {
            videoFormat = "mp4"
          } else if (chunkData.type.includes("webm")) {
            videoFormat = "webm"
          }
        }
      }

      if (videoBlobs.length > 0) {
        // Use the original video format from session config if available
        const sessionVideoFormat =
          sessionData.session.config.videoFormat || videoFormat
        const mimeType =
          sessionVideoFormat === "mp4" ? "video/mp4" : "video/webm"
        const videoBlob = new Blob(videoBlobs, { type: mimeType })

        filesToDownload.push({
          content: videoBlob,
          filename: getFilename(`recording.${sessionVideoFormat}`),
          mimeType: mimeType,
        })
      }
    } catch (error) {
      console.error("Failed to prepare video data:", error)
    }
  }

  return filesToDownload
}

/**
 * Download session data with flexible options
 */
export const downloadSession = async (
  sessionId: string,
  options: DownloadSessionOptions = {},
): Promise<void> => {
  // Default all include options to true
  const includeOptions = {
    metadata: true,
    gaze: true,
    events: true,
    video: true,
    ...options.include,
  }

  // Default asZip to false
  const asZip = options.asZip ?? false

  const filesToDownload = await collectSessionFiles(sessionId, {
    includeOptions,
    prefix: options.prefix,
  })

  // Download logic
  if (filesToDownload.length === 0) {
    console.warn("No files to download")
    return
  }

  if (asZip) {
    // Download as ZIP
    const files: Record<string, Uint8Array> = {}
    for (const file of filesToDownload) {
      const filename = options.prefix
        ? file.filename.split("/").pop() || file.filename
        : file.filename.split("-").pop() || file.filename
      const content =
        file.content instanceof Blob
          ? new Uint8Array(await file.content.arrayBuffer())
          : strToU8(file.content)
      files[filename] = content
    }

    const sessionName = getSessionName(sessionId)
    const zipped = zipSync(files)
    const zipBlob = new Blob([zipped], { type: "application/zip" })
    downloadFile(zipBlob, `${sessionName}.zip`, "application/zip")
  } else {
    // Download as separate files
    for (const file of filesToDownload) {
      downloadFile(file.content, file.filename, file.mimeType)
    }
  }
}

/**
 * Download complete session data as multiple files (JSON + CSV + Video)
 */
export const downloadCompleteSessionData = async (
  sessionId: string,
): Promise<void> => {
  const sessionData = await getSessionData(sessionId)
  const sessionName = `session-${sessionId}-${new Date().toISOString().split("T")[0]}`

  // 1. Download metadata as JSON
  const metadata = createMetadataJSON(sessionData)
  downloadFile(
    JSON.stringify(metadata, null, 2),
    `${sessionName}-metadata.json`,
    "application/json",
  )

  // 2. Download gaze data as CSV
  if (sessionData.gazeData.length > 0) {
    const gazeCSV = gazeDataToCSV(
      sessionData.gazeData,
      sessionData.metadata.startBrowserTime,
    )
    downloadFile(gazeCSV, `${sessionName}-gaze.csv`, "text/csv")
  }

  // 3. Download events as CSV
  if (sessionData.events.length > 0) {
    const eventsCSV = eventsToCSV(sessionData.events)
    downloadFile(eventsCSV, `${sessionName}-events.csv`, "text/csv")
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
        const combinedVideo = new Blob(videoBlobs, { type: "video/webm" })
        downloadFile(
          combinedVideo,
          `${sessionName}-recording.webm`,
          "video/webm",
        )
      }
    } catch (error) {
      console.error("Failed to download video data:", error)
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
End Time: ${sessionData.session.endTime ? new Date(sessionData.session.endTime).toLocaleString() : "N/A"}
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
