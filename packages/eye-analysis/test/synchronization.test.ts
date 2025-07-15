import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addSyncMarker,
  calculateSyncQuality,
  getRelativeTimestamp,
  initializeSynchronization,
  resetSynchronizationState,
  stopSynchronization,
  validateDataSync,
} from "../services/synchronization"

describe("Synchronization", () => {
  beforeEach(() => {
    resetSynchronizationState()
    vi.clearAllMocks()
  })

  describe("initializeSynchronization", () => {
    it("should initialize sync with session ID", () => {
      const sessionId = "test-session"
      initializeSynchronization(sessionId)

      expect(getRelativeTimestamp()).toBeGreaterThanOrEqual(0)
    })
  })

  describe("addSyncMarker", () => {
    it("should add a sync marker", () => {
      initializeSynchronization("test-session")

      const marker = addSyncMarker("test_marker", { test: "data" })

      expect(marker).toHaveProperty("id")
      expect(marker.sessionId).toBe("test-session")
      expect(marker.type).toBe("test_marker")
      expect(marker.data).toEqual({ test: "data" })
    })
  })

  describe("getRelativeTimestamp", () => {
    it("should return relative timestamp", () => {
      initializeSynchronization("test-session")

      const timestamp = getRelativeTimestamp()
      expect(timestamp).toBeGreaterThanOrEqual(0)
    })
  })

  describe("validateDataSync", () => {
    it("should validate data sync within threshold", () => {
      const result = validateDataSync(1000, 1010)
      expect(result).toBe(true)
    })

    it("should reject data sync outside threshold", () => {
      const result = validateDataSync(1000, 1020)
      expect(result).toBe(false)
    })
  })

  describe("calculateSyncQuality", () => {
    it("should return poor quality with insufficient markers", () => {
      initializeSynchronization("test-session")

      const quality = calculateSyncQuality()
      expect(quality.quality).toBe("poor")
    })

    it("should calculate sync quality with multiple markers", () => {
      initializeSynchronization("test-session")

      // Add multiple markers
      addSyncMarker("marker1")
      addSyncMarker("marker2")
      addSyncMarker("marker3")

      const quality = calculateSyncQuality()
      expect(quality).toHaveProperty("maxTimeOffset")
      expect(quality).toHaveProperty("averageOffset")
      expect(quality).toHaveProperty("quality")
    })
  })

  describe("stopSynchronization", () => {
    it("should stop sync system", () => {
      initializeSynchronization("test-session")
      stopSynchronization()

      // Should not throw error
      expect(() => stopSynchronization()).not.toThrow()
    })
  })
})
