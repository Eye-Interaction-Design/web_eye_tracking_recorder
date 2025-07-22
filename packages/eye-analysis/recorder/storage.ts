// Data storage layer (IndexedDB wrapper)

import type {
  GazePoint,
  SessionData,
  SessionEvent,
  SessionInfo,
  VideoChunkInfo,
} from "./types"

const DB_NAME = "EyeAnalysisDB"
const DB_VERSION = 4

// Use globalThis to ensure database instance is shared across all modules
declare global {
  var __eyeAnalysisDB: IDBDatabase | null
}

const getDb = (): IDBDatabase | null => {
  return globalThis.__eyeAnalysisDB || null
}

const setDb = (database: IDBDatabase | null): void => {
  globalThis.__eyeAnalysisDB = database
}

export const initializeStorage = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (currentDb) {
      resolve()
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    setupDatabase(request, resolve, reject)
  })
}

const setupDatabase = (
  request: IDBOpenDBRequest,
  resolve: () => void,
  reject: (error: Error) => void,
) => {
  request.onerror = () => {
    reject(new Error("Failed to open database"))
  }

  request.onsuccess = () => {
    setDb(request.result)
    resolve()
  }

  request.onupgradeneeded = () => {
    const database = request.result

    // Sessions store
    if (!database.objectStoreNames.contains("sessions")) {
      const sessionStore = database.createObjectStore("sessions", {
        keyPath: "sessionId",
      })
      sessionStore.createIndex("participantId", "participantId", {
        unique: false,
      })
      sessionStore.createIndex("startTime", "startTime", { unique: false })
    }

    // Events store
    if (!database.objectStoreNames.contains("events")) {
      const eventStore = database.createObjectStore("events", {
        keyPath: "id",
      })
      eventStore.createIndex("sessionId", "sessionId", { unique: false })
      eventStore.createIndex("timestamp", "timestamp", { unique: false })
    }

    // Gaze data store
    if (!database.objectStoreNames.contains("gazeData")) {
      const gazeStore = database.createObjectStore("gazeData", {
        autoIncrement: true,
      })
      gazeStore.createIndex("sessionId", "sessionId", { unique: false })
      gazeStore.createIndex("systemTimestamp", "systemTimestamp", {
        unique: false,
      })
    }

    // Video chunks store
    if (!database.objectStoreNames.contains("videoChunks")) {
      const videoStore = database.createObjectStore("videoChunks", {
        keyPath: "id",
      })
      videoStore.createIndex("sessionId", "sessionId", { unique: false })
      videoStore.createIndex("timestamp", "timestamp", { unique: false })
    }
  }
}

// Database management
export const resetDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Close existing connection
    const currentDb = getDb()
    if (currentDb) {
      currentDb.close()
      setDb(null)
    }

    // Delete the database
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
    deleteRequest.onsuccess = () => {
      resolve()
    }
    deleteRequest.onerror = () => {
      reject(new Error("Failed to reset database"))
    }
  })
}

// Session operations
export const saveSession = async (session: SessionInfo): Promise<void> => {
  await ensureDatabaseReady()
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["sessions"], "readwrite")
    const store = transaction.objectStore("sessions")
    const request = store.put(session)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error("Failed to save session"))
  })
}

export const getSession = async (
  sessionId: string,
): Promise<SessionInfo | null> => {
  await ensureDatabaseReady()
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["sessions"], "readonly")
    const store = transaction.objectStore("sessions")
    const request = store.get(sessionId)

    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(new Error("Failed to get session"))
  })
}

// Event operations
export const saveEvent = (event: SessionEvent): Promise<void> => {
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["events"], "readwrite")
    const store = transaction.objectStore("events")
    const request = store.add(event)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error("Failed to save event"))
  })
}

// Gaze data operations
export const saveGazeData = (
  sessionId: string,
  gazePoint: GazePoint,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const dataWithSession = {
      ...gazePoint,
      // Override with storage-specific id if needed
      storageId: `${sessionId}-${gazePoint.systemTimestamp}-${Math.random()}`,
    }

    const transaction = currentDb.transaction(["gazeData"], "readwrite")
    const store = transaction.objectStore("gazeData")
    const request = store.add(dataWithSession)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error("Failed to save gaze data"))
  })
}

// Video chunk operations
export const saveVideoChunk = (chunk: {
  id: string
  sessionId: string
  timestamp: number
  data: Blob
  chunkIndex: number
  duration: number
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["videoChunks"], "readwrite")
    const store = transaction.objectStore("videoChunks")
    const request = store.add(chunk)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error("Failed to save video chunk"))
  })
}

// Database readiness check with retry mechanism
const ensureDatabaseReady = (retries = 10, delay = 500): Promise<void> => {
  return new Promise((resolve, reject) => {
    const check = (attemptsLeft: number) => {
      const currentDb = getDb()

      if (currentDb && currentDb.version === DB_VERSION) {
        resolve()
        return
      }

      if (attemptsLeft === 0) {
        reject(
          new Error(
            `Database not initialized or ready after ${retries} attempts. Current db: ${currentDb ? `version ${currentDb.version}` : "null"}`,
          ),
        )
        return
      }

      setTimeout(() => check(attemptsLeft - 1), delay)
    }

    check(retries)
  })
}

// Get complete session data
export const getSessionData = async (
  sessionId: string,
  options?: {
    startBrowserTime?: number
    endBrowserTime?: number
  },
): Promise<SessionData> => {
  // Wait for database to be ready before proceeding
  await ensureDatabaseReady()

  const currentDb = getDb()
  if (!currentDb) {
    throw new Error("Database not initialized")
  }

  const session = await getSession(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }

  // Get events
  const events = await new Promise<SessionEvent[]>(
    (resolveEvents, rejectEvents) => {
      const currentDb = getDb()
      if (!currentDb) {
        rejectEvents(new Error("Database not initialized"))
        return
      }
      const transaction = currentDb.transaction(["events"], "readonly")
      const store = transaction.objectStore("events")
      const index = store.index("sessionId")
      const request = index.getAll(sessionId)

      request.onsuccess = () => resolveEvents(request.result)
      request.onerror = () => rejectEvents(new Error("Failed to get events"))
    },
  )

  // Get gaze data
  const gazeData = await new Promise<GazePoint[]>((resolveGaze, rejectGaze) => {
    const currentDb = getDb()
    if (!currentDb) {
      rejectGaze(new Error("Database not initialized"))
      return
    }
    const transaction = currentDb.transaction(["gazeData"], "readonly")
    const store = transaction.objectStore("gazeData")
    const index = store.index("sessionId")
    const request = index.getAll(sessionId)

    request.onsuccess = () => {
      const data = request.result.map((item) => {
        const { sessionId: _, ...gazePoint } = item
        return gazePoint as GazePoint
      })
      resolveGaze(data)
    }
    request.onerror = () => rejectGaze(new Error("Failed to get gaze data"))
  })

  // Get video chunks info
  const videoChunks = await new Promise<VideoChunkInfo[]>(
    (resolveVideo, rejectVideo) => {
      const currentDb = getDb()
      if (!currentDb) {
        rejectVideo(new Error("Database not initialized"))
        return
      }
      const transaction = currentDb.transaction(["videoChunks"], "readonly")
      const store = transaction.objectStore("videoChunks")
      const index = store.index("sessionId")
      const request = index.getAll(sessionId)

      request.onsuccess = () => {
        const chunks = request.result.map((chunk) => ({
          id: chunk.id,
          sessionId: chunk.sessionId,
          timestamp: chunk.timestamp,
          chunkIndex: chunk.chunkIndex,
          duration: chunk.duration,
          size: chunk.data?.size || 0,
        }))
        resolveVideo(chunks)
      }
      request.onerror = () =>
        rejectVideo(new Error("Failed to get video chunks"))
    },
  )

  // Auto-detect recording start/stop times from events if not provided
  let startBrowserTime =
    options?.startBrowserTime ?? session.metadata?.startBrowserTime
  let endBrowserTime =
    options?.endBrowserTime ?? session.metadata?.endBrowserTime

  if (!startBrowserTime || !endBrowserTime) {
    const recordingStartEvent = events.find((e) => e.type === "recording_start")
    const recordingStopEvent = events.find((e) => e.type === "recording_stop")

    if (recordingStartEvent) {
      startBrowserTime =
        startBrowserTime ?? recordingStartEvent.browserTimestamp
    }
    if (recordingStopEvent) {
      endBrowserTime = endBrowserTime ?? recordingStopEvent.browserTimestamp
    }
  }

  // Filter gaze data and events by browser timestamp range
  let filteredGazeData = gazeData
  let filteredEvents = events

  if (startBrowserTime !== undefined || endBrowserTime !== undefined) {
    // Filter gaze data within recording period
    filteredGazeData = gazeData.filter((gaze) => {
      if (
        startBrowserTime !== undefined &&
        gaze.browserTimestamp < startBrowserTime
      ) {
        return false
      }
      if (
        endBrowserTime !== undefined &&
        gaze.browserTimestamp > endBrowserTime
      ) {
        return false
      }
      return true
    })

    // Filter events within recording period (but keep session_start, session_stop, recording_start, recording_stop)
    filteredEvents = events.filter((event) => {
      // Always keep system events
      if (
        [
          "session_start",
          "session_stop",
          "recording_start",
          "recording_stop",
        ].includes(event.type)
      ) {
        return true
      }

      // Filter user events by browser timestamp
      if (
        startBrowserTime !== undefined &&
        event.browserTimestamp < startBrowserTime
      ) {
        return false
      }
      if (
        endBrowserTime !== undefined &&
        event.browserTimestamp > endBrowserTime
      ) {
        return false
      }
      return true
    })
  }

  const sessionData: SessionData = {
    session,
    events: filteredEvents,
    gazeData: filteredGazeData,
    videoChunks,
    metadata: {
      totalDuration: session.endTime ? session.endTime - session.startTime : 0,
      gazeDataPoints: filteredGazeData.length,
      eventsCount: filteredEvents.length,
      chunksCount: videoChunks.length,
      exportedAt: new Date().toISOString(),
      startBrowserTime,
      endBrowserTime,
    },
  }

  return sessionData
}

// Get video chunk blob data
export const getVideoChunkData = async (
  chunkId: string,
): Promise<Blob | null> => {
  await ensureDatabaseReady()
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["videoChunks"], "readonly")
    const store = transaction.objectStore("videoChunks")
    const request = store.get(chunkId)

    request.onsuccess = () => {
      const chunk = request.result
      resolve(chunk?.data || null)
    }
    request.onerror = () => reject(new Error("Failed to get video chunk data"))
  })
}

/**
 * Get database storage usage estimate
 */
export const getStorageUsage = async (): Promise<{
  used: number
  available: number
  percentage: number
}> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    const used = estimate.usage || 0
    const available = estimate.quota || 0
    const percentage = available > 0 ? (used / available) * 100 : 0

    return { used, available, percentage }
  }

  // Fallback for browsers without storage API
  return { used: 0, available: 0, percentage: 0 }
}

/**
 * Clean up old video chunks to free space
 */
export const cleanupOldVideoChunks = async (
  keepRecentHours: number = 24,
): Promise<number> => {
  const currentDb = getDb()
  if (!currentDb) {
    throw new Error("Database not initialized")
  }

  const cutoffTime = Date.now() - keepRecentHours * 60 * 60 * 1000
  let deletedCount = 0

  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not available"))
      return
    }
    const transaction = currentDb.transaction(["videoChunks"], "readwrite")
    const store = transaction.objectStore("videoChunks")
    const index = store.index("timestamp")
    const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime))

    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        deletedCount++
        cursor.continue()
      }
    }

    transaction.oncomplete = () => resolve(deletedCount)
    transaction.onerror = () =>
      reject(new Error("Failed to cleanup video chunks"))
  })
}

/**
 * Auto-cleanup when storage is getting full
 */
export const autoCleanupStorage = async (
  triggerPercentage: number = 80,
): Promise<void> => {
  const usage = await getStorageUsage()

  if (usage.percentage >= triggerPercentage) {
    console.warn(
      `Storage usage at ${usage.percentage.toFixed(1)}%, starting cleanup...`,
    )

    // Clean up old video chunks (keep recent 12 hours)
    await cleanupOldVideoChunks(12)

    // Check if we need more aggressive cleanup
    const newUsage = await getStorageUsage()
    if (newUsage.percentage >= triggerPercentage) {
      // More aggressive cleanup - keep only 6 hours
      await cleanupOldVideoChunks(6)
    }
  }
}

/**
 * Get list of all sessions for cleanup/export
 */
export const getAllSessions = (): Promise<SessionInfo[]> => {
  return new Promise((resolve, reject) => {
    const currentDb = getDb()
    if (!currentDb) {
      reject(new Error("Database not initialized"))
      return
    }

    const transaction = currentDb.transaction(["sessions"], "readonly")
    const store = transaction.objectStore("sessions")
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error("Failed to get sessions"))
  })
}

/**
 * Delete a complete session and all its data
 */
export const deleteSession = async (sessionId: string): Promise<void> => {
  const currentDb = getDb()
  if (!currentDb) {
    throw new Error("Database not initialized")
  }

  const transaction = currentDb.transaction(
    ["sessions", "events", "gazeData", "videoChunks"],
    "readwrite",
  )

  // Delete session
  const sessionStore = transaction.objectStore("sessions")
  sessionStore.delete(sessionId)

  // Delete events
  const eventStore = transaction.objectStore("events")
  const eventIndex = eventStore.index("sessionId")
  const eventRequest = eventIndex.openCursor(IDBKeyRange.only(sessionId))
  eventRequest.onsuccess = () => {
    const cursor = eventRequest.result
    if (cursor) {
      cursor.delete()
      cursor.continue()
    }
  }

  // Delete gaze data
  const gazeStore = transaction.objectStore("gazeData")
  const gazeIndex = gazeStore.index("sessionId")
  const gazeRequest = gazeIndex.openCursor(IDBKeyRange.only(sessionId))
  gazeRequest.onsuccess = () => {
    const cursor = gazeRequest.result
    if (cursor) {
      cursor.delete()
      cursor.continue()
    }
  }

  // Delete video chunks
  const videoStore = transaction.objectStore("videoChunks")
  const videoIndex = videoStore.index("sessionId")
  const videoRequest = videoIndex.openCursor(IDBKeyRange.only(sessionId))
  videoRequest.onsuccess = () => {
    const cursor = videoRequest.result
    if (cursor) {
      cursor.delete()
      cursor.continue()
    }
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(new Error("Failed to delete session"))
  })
}
