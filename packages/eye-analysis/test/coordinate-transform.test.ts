import { describe, expect, it } from "vitest"
import {
  transformToContentCoordinates,
  transformToPageCoordinates,
  transformToNormalizedCoordinates,
  transformGazeCoordinates,
  isGazeWithinRecordingBounds,
} from "../recorder/coordinate-transform"
import type { SessionInfo, WindowState } from "../recorder/types"

describe("Coordinate Transform Functions", () => {
  const mockSessionFullScreen: SessionInfo = {
    sessionId: "test-session",
    participantId: "test-participant",
    experimentType: "test-experiment",
    startTime: Date.now(),
    recordingMode: "full-screen",
    recordingReference: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
      },
      window: {
        innerWidth: 1920,
        innerHeight: 1080,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1,
        screenX: 0,
        screenY: 0,
        outerWidth: 1920,
        outerHeight: 1080,
      },
    },
    config: {
      frameRate: 30,
      quality: "medium",
      chunkDuration: 5,
      captureEntireScreen: false,
    },
  }

  const mockSessionCurrentTab: SessionInfo = {
    sessionId: "test-session",
    participantId: "test-participant",
    experimentType: "test-experiment",
    startTime: Date.now(),
    recordingMode: "current-tab",
    recordingReference: {
      screen: {
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
      },
      window: {
        innerWidth: 1200,
        innerHeight: 800,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1,
        screenX: 100,
        screenY: 50,
        outerWidth: 1220,
        outerHeight: 850,
      },
    },
    config: {
      frameRate: 30,
      quality: "medium",
      chunkDuration: 5,
      captureEntireScreen: false,
    },
  }

  const mockWindowState: WindowState = {
    screenX: 100,
    screenY: 50,
    scrollX: 0,
    scrollY: 0,
    innerWidth: 1200,
    innerHeight: 800,
    outerWidth: 1220,
    outerHeight: 850,
  }

  describe("transformToContentCoordinates", () => {
    it("should return screen coordinates for full-screen recording", () => {
      const result = transformToContentCoordinates(
        500,
        300,
        mockSessionFullScreen,
      )

      expect(result).toEqual({
        contentX: 0,
        contentY: 0,
      })
    })

    it("should transform to window coordinates for current-tab recording", () => {
      const result = transformToContentCoordinates(
        600, // screen coordinate
        350, // screen coordinate
        mockSessionCurrentTab,
        mockWindowState,
      )

      expect(result).toEqual({
        contentX: 500, // 600 - 100 (windowState.screenX)
        contentY: 300, // 350 - 50 (windowState.screenY)
      })
    })

    it("should handle normalized coordinates for current-tab recording", () => {
      const result = transformToContentCoordinates(
        0.5, // normalized X (50% of screen)
        0.25, // normalized Y (25% of screen)
        mockSessionCurrentTab,
        mockWindowState,
        true, // isNormalized
        1920, // screenWidth
        1080, // screenHeight
      )

      expect(result).toEqual({
        contentX: 860, // (0.5 * 1920) - 100 = 960 - 100 = 860
        contentY: 220, // (0.25 * 1080) - 50 = 270 - 50 = 220
      })
    })

    it("should throw error for normalized coordinates without screen dimensions", () => {
      expect(() => {
        transformToContentCoordinates(
          0.5,
          0.25,
          mockSessionCurrentTab,
          mockWindowState,
          true,
        )
      }).toThrow("Screen dimensions are required for normalized coordinates")
    })

    it("should throw error for window-based recording without windowState", () => {
      expect(() => {
        transformToContentCoordinates(500, 300, mockSessionCurrentTab)
      }).toThrow("WindowState is required for current-tab recording")
    })
  })

  describe("transformToPageCoordinates", () => {
    it("should return null for full-screen recording", () => {
      const result = transformToPageCoordinates(500, 300, mockSessionFullScreen)

      expect(result).toBeNull()
    })

    it("should transform to page coordinates for current-tab recording", () => {
      const windowStateWithScroll: WindowState = {
        ...mockWindowState,
        scrollX: 200,
        scrollY: 100,
      }

      const result = transformToPageCoordinates(
        600,
        350,
        mockSessionCurrentTab,
        windowStateWithScroll,
      )

      expect(result).toEqual({
        pageX: 700, // (600 - 100) + 200 (scroll)
        pageY: 400, // (350 - 50) + 100 (scroll)
      })
    })

    it("should handle normalized coordinates for page transformation", () => {
      const windowStateWithScroll: WindowState = {
        ...mockWindowState,
        scrollX: 200,
        scrollY: 100,
      }

      const result = transformToPageCoordinates(
        0.5, // normalized X
        0.25, // normalized Y
        mockSessionCurrentTab,
        windowStateWithScroll,
        true, // isNormalized
        1920, // screenWidth
        1080, // screenHeight
      )

      expect(result).toEqual({
        pageX: 1060, // (0.5 * 1920) - 100 + 200 = 960 - 100 + 200 = 1060
        pageY: 320, // (0.25 * 1080) - 50 + 100 = 270 - 50 + 100 = 320
      })
    })

    // Temporarily disabled browser-window mode
    // it("should return null for browser-window recording without windowState", () => {
    //   const result = transformToPageCoordinates(500, 300, {
    //     ...mockSessionCurrentTab,
    //     recordingMode: "browser-window",
    //   })

    //   expect(result).toBeNull()
    // })
  })

  describe("transformToNormalizedCoordinates", () => {
    it("should normalize coordinates for full-screen recording", () => {
      const result = transformToNormalizedCoordinates(
        960, // half of screen width
        540, // half of screen height
        mockSessionFullScreen,
      )

      expect(result.normalizedX).toBeCloseTo(0)
      expect(result.normalizedY).toBeCloseTo(0)
    })

    it("should normalize coordinates for current-tab recording", () => {
      const result = transformToNormalizedCoordinates(
        700, // screenX
        450, // screenY
        mockSessionCurrentTab,
        mockWindowState,
      )

      expect(result.normalizedX).toBeCloseTo(0.5) // (700 - 100) / 1200
      expect(result.normalizedY).toBeCloseTo(0.5) // (450 - 50) / 800
    })

    it("should clamp normalized coordinates to 0-1 range", () => {
      const result = transformToNormalizedCoordinates(
        -100, // negative coordinate
        2000, // coordinate beyond screen
        mockSessionCurrentTab,
        mockWindowState,
      )

      expect(result.normalizedX).toBe(0)
      expect(result.normalizedY).toBe(1)
    })
  })

  describe("isGazeWithinRecordingBounds", () => {
    it("should always return true for full-screen recording", () => {
      const result = isGazeWithinRecordingBounds(
        -500, // even negative coordinates
        3000, // even beyond screen
        mockSessionFullScreen,
      )

      expect(result).toBe(true)
    })

    it("should return true for coordinates within window bounds", () => {
      const result = isGazeWithinRecordingBounds(
        600, // within bounds
        350, // within bounds
        mockSessionCurrentTab,
        mockWindowState,
      )

      expect(result).toBe(true)
    })

    it("should return false for coordinates outside window bounds", () => {
      const result = isGazeWithinRecordingBounds(
        50, // outside left bound (50 < 100)
        350,
        mockSessionCurrentTab,
        mockWindowState,
      )

      expect(result).toBe(false)
    })

    it("should return false when windowState is missing for window-based recording", () => {
      expect(() => {
        isGazeWithinRecordingBounds(600, 350, mockSessionCurrentTab)
      }).toThrow("WindowState is required for current-tab recording")
    })
  })

  describe("transformGazeCoordinates", () => {
    it("should transform all coordinate systems for current-tab recording", () => {
      const windowStateWithScroll: WindowState = {
        ...mockWindowState,
        scrollX: 100,
        scrollY: 50,
      }

      const result = transformGazeCoordinates(
        600,
        350,
        mockSessionCurrentTab,
        windowStateWithScroll,
      )

      expect(result.screen).toEqual({ x: 600, y: 350 })
      expect(result.content).toEqual({ contentX: 500, contentY: 300 })
      expect(result.page).toEqual({ pageX: 600, pageY: 350 })
      expect(result.normalized.normalizedX).toBeCloseTo(0.417) // 500/1200
      expect(result.normalized.normalizedY).toBeCloseTo(0.375) // 300/800
      expect(result.isWithinBounds).toBe(true)
    })

    it("should handle full-screen recording correctly", () => {
      const result = transformGazeCoordinates(960, 540, mockSessionFullScreen)

      expect(result.screen).toEqual({ x: 960, y: 540 })
      expect(result.content).toEqual({ contentX: 0, contentY: 0 })
      expect(result.page).toBeNull()
      expect(result.isWithinBounds).toBe(true)
    })
  })
})
