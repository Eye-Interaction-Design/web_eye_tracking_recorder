import type {
  GazePoint,
  SessionEvent,
  SessionInfo,
  VideoChunkInfo,
  ExperimentSession,
  SyncMarker,
  VideoChunk,
} from "../recorder/types"

let db: IDBDatabase | null = null
const DB_NAME = "ExperimentDB"
const DB_VERSION = 1

export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error("Failed to open database"))
    }

    request.onsuccess = () => {
      db = request.result
      resolve()
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result
      createStores(database)
    }
  })
}

const createStores = (database: IDBDatabase): void => {
  if (!database.objectStoreNames.contains("sessions")) {
    const sessionsStore = database.createObjectStore("sessions", {
      keyPath: "sessionId",
    })
    sessionsStore.createIndex("startTime", "startTime", { unique: false })
    sessionsStore.createIndex("status", "status", { unique: false })
  }

  if (!database.objectStoreNames.contains("videoChunks")) {
    const videoStore = database.createObjectStore("videoChunks", {
      keyPath: "id",
    })
    videoStore.createIndex("sessionId", "sessionId", { unique: false })
    videoStore.createIndex("timestamp", "timestamp", { unique: false })
  }

  if (!database.objectStoreNames.contains("gazeData")) {
    const gazeStore = database.createObjectStore("gazeData", {
      keyPath: "id",
      autoIncrement: true,
    })
    gazeStore.createIndex("sessionId", "sessionId", { unique: false })
    gazeStore.createIndex("timestamp", "browserTimestamp", { unique: false })
  }

  if (!database.objectStoreNames.contains("events")) {
    const eventsStore = database.createObjectStore("events", {
      keyPath: "id",
      autoIncrement: true,
    })
    eventsStore.createIndex("sessionId", "sessionId", { unique: false })
    eventsStore.createIndex("timestamp", "timestamp", { unique: false })
    eventsStore.createIndex("type", "type", { unique: false })
  }

  if (!database.objectStoreNames.contains("syncMarkers")) {
    const syncStore = database.createObjectStore("syncMarkers", {
      keyPath: "id",
      autoIncrement: true,
    })
    syncStore.createIndex("sessionId", "sessionId", { unique: false })
    syncStore.createIndex("timestamp", "timestamp", { unique: false })
  }
}

export const saveSession = (session: ExperimentSession): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["sessions"], "readwrite")
  const store = transaction.objectStore("sessions")

  return new Promise((resolve, reject) => {
    const request = store.put(session)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const getSession = (
  sessionId: string,
): Promise<ExperimentSession | null> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["sessions"], "readonly")
  const store = transaction.objectStore("sessions")

  return new Promise((resolve, reject) => {
    const request = store.get(sessionId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

export const saveVideoChunk = (chunk: VideoChunk): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["videoChunks"], "readwrite")
  const store = transaction.objectStore("videoChunks")

  return new Promise((resolve, reject) => {
    const request = store.put(chunk)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const saveGazeData = (gazePoints: GazePoint[]): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["gazeData"], "readwrite")
  const store = transaction.objectStore("gazeData")

  return new Promise((resolve, reject) => {
    let completed = 0

    for (const point of gazePoints) {
      const request = store.add(point)
      request.onsuccess = () => {
        completed++
        if (completed === gazePoints.length) resolve()
      }
      request.onerror = () => reject(request.error)
    }
  })
}

export const saveEvent = (event: SessionEvent): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["events"], "readwrite")
  const store = transaction.objectStore("events")

  return new Promise((resolve, reject) => {
    const request = store.add(event)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const saveSyncMarker = (marker: SyncMarker): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["syncMarkers"], "readwrite")
  const store = transaction.objectStore("syncMarkers")

  return new Promise((resolve, reject) => {
    const request = store.add(marker)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const getSessionData = async (
  sessionId: string,
): Promise<{
  session: ExperimentSession | null
  videoChunks: VideoChunk[]
  gazeData: GazePoint[]
  events: SessionEvent[]
  syncMarkers: SyncMarker[]
}> => {
  if (!db) throw new Error("Database not initialized")

  const [session, videoChunks, gazeData, events, syncMarkers] =
    await Promise.all([
      getSession(sessionId),
      getVideoChunks(sessionId),
      getGazeData(sessionId),
      getEvents(sessionId),
      getSyncMarkers(sessionId),
    ])

  return { session, videoChunks, gazeData, events, syncMarkers }
}

export const getVideoChunks = (sessionId: string): Promise<VideoChunk[]> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["videoChunks"], "readonly")
  const store = transaction.objectStore("videoChunks")
  const index = store.index("sessionId")

  return new Promise((resolve, reject) => {
    const request = index.getAll(sessionId)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export const getGazeData = (sessionId: string): Promise<GazePoint[]> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["gazeData"], "readonly")
  const store = transaction.objectStore("gazeData")
  const index = store.index("sessionId")

  return new Promise((resolve, reject) => {
    const request = index.getAll(sessionId)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export const getEvents = (sessionId: string): Promise<SessionEvent[]> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["events"], "readonly")
  const store = transaction.objectStore("events")
  const index = store.index("sessionId")

  return new Promise((resolve, reject) => {
    const request = index.getAll(sessionId)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export const getSyncMarkers = (sessionId: string): Promise<SyncMarker[]> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["syncMarkers"], "readonly")
  const store = transaction.objectStore("syncMarkers")
  const index = store.index("sessionId")

  return new Promise((resolve, reject) => {
    const request = index.getAll(sessionId)
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export const checkForIncompleteSessions = (): Promise<ExperimentSession[]> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(["sessions"], "readonly")
  const store = transaction.objectStore("sessions")
  const index = store.index("status")

  return new Promise((resolve, reject) => {
    const request = index.getAll("recording")
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

export const deleteSession = (sessionId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized")

  const transaction = db.transaction(
    ["sessions", "videoChunks", "gazeData", "events", "syncMarkers"],
    "readwrite",
  )

  const promises = [
    deleteFromStore(transaction, "sessions", sessionId),
    deleteFromIndex(transaction, "videoChunks", "sessionId", sessionId),
    deleteFromIndex(transaction, "gazeData", "sessionId", sessionId),
    deleteFromIndex(transaction, "events", "sessionId", sessionId),
    deleteFromIndex(transaction, "syncMarkers", "sessionId", sessionId),
  ]

  return Promise.all(promises).then(() => {})
}

const deleteFromStore = (
  transaction: IDBTransaction,
  storeName: string,
  key: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

const deleteFromIndex = (
  transaction: IDBTransaction,
  storeName: string,
  indexName: string,
  key: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const store = transaction.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAllKeys(key)

    request.onsuccess = () => {
      const keys = request.result
      let deleted = 0

      for (const keyToDelete of keys) {
        const deleteRequest = store.delete(keyToDelete)
        deleteRequest.onsuccess = () => {
          deleted++
          if (deleted === keys.length) resolve()
        }
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }

      if (keys.length === 0) resolve()
    }

    request.onerror = () => reject(request.error)
  })
}
