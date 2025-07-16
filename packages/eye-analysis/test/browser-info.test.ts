import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  getBrowserWindowInfo,
  getScreenInfo,
  screenToWindowCoordinatesSync,
  windowToContentCoordinates,
  windowToScreenCoordinatesSync,
} from "../recorder/browser-info"

describe("Browser Info Utilities", () => {
  // Mock window and screen objects
  const mockWindow = {
    innerWidth: 1200,
    innerHeight: 800,
    scrollX: 100,
    scrollY: 50,
    devicePixelRatio: 2.0,
    screenX: 300,
    screenY: 100,
    outerWidth: 1220,
    outerHeight: 850,
  }

  const mockScreen = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
  }

  beforeEach(() => {
    // Mock global objects
    Object.defineProperty(global, "window", {
      value: mockWindow,
      writable: true,
    })
    Object.defineProperty(global, "screen", {
      value: mockScreen,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("getBrowserWindowInfo", () => {
    it("should return correct window information", () => {
      const windowInfo = getBrowserWindowInfo()

      expect(windowInfo).toEqual({
        innerWidth: 1200,
        innerHeight: 800,
        scrollX: 100,
        scrollY: 50,
        devicePixelRatio: 2.0,
        screenX: 300,
        screenY: 100,
        outerWidth: 1220,
        outerHeight: 850,
      })
    })

    // This test is unnecessary since SSR guard was removed
    it("should work with real window object", () => {
      const windowInfo = getBrowserWindowInfo()

      expect(typeof windowInfo.innerWidth).toBe("number")
      expect(typeof windowInfo.innerHeight).toBe("number")
      expect(typeof windowInfo.scrollX).toBe("number")
      expect(typeof windowInfo.scrollY).toBe("number")
      expect(typeof windowInfo.devicePixelRatio).toBe("number")
      expect(typeof windowInfo.screenX).toBe("number")
      expect(typeof windowInfo.screenY).toBe("number")
      expect(typeof windowInfo.outerWidth).toBe("number")
      expect(typeof windowInfo.outerHeight).toBe("number")
    })
  })

  describe("getScreenInfo", () => {
    it("should return correct screen information", () => {
      const screenInfo = getScreenInfo()

      expect(screenInfo).toEqual({
        width: 1920,
        height: 1080,
        availWidth: 1920,
        availHeight: 1040,
      })
    })

    // This test is unnecessary since SSR guard was removed
    it("should work with real screen object", () => {
      const screenInfo = getScreenInfo()

      expect(typeof screenInfo.width).toBe("number")
      expect(typeof screenInfo.height).toBe("number")
      expect(typeof screenInfo.availWidth).toBe("number")
      expect(typeof screenInfo.availHeight).toBe("number")
    })
  })

  describe("coordinate conversion functions", () => {
    const windowInfo = {
      innerWidth: 1200,
      innerHeight: 800,
      scrollX: 100,
      scrollY: 50,
      devicePixelRatio: 2.0,
      screenX: 300,
      screenY: 100,
      outerWidth: 1220,
      outerHeight: 850,
    }

    describe("screenToWindowCoordinates", () => {
      it("should convert screen coordinates to window coordinates correctly", () => {
        const result = screenToWindowCoordinatesSync(800, 400, windowInfo)

        expect(result).toEqual({
          windowX: 500, // 800 - 300
          windowY: 300, // 400 - 100
        })
      })

      it("should handle negative window coordinates", () => {
        const result = screenToWindowCoordinatesSync(200, 50, windowInfo)

        expect(result).toEqual({
          windowX: -100, // 200 - 300
          windowY: -50, // 50 - 100
        })
      })
    })

    describe("windowToScreenCoordinates", () => {
      it("should convert window coordinates to screen coordinates correctly", () => {
        const result = windowToScreenCoordinatesSync(500, 300, windowInfo)

        expect(result).toEqual({
          screenX: 800, // 500 + 300
          screenY: 400, // 300 + 100
        })
      })

      it("should handle negative window coordinates", () => {
        const result = windowToScreenCoordinatesSync(-100, -50, windowInfo)

        expect(result).toEqual({
          screenX: 200, // -100 + 300
          screenY: 50, // -50 + 100
        })
      })
    })

    describe("windowToContentCoordinates", () => {
      it("should convert window coordinates to content coordinates with scroll", () => {
        const result = windowToContentCoordinates(400, 200, windowInfo)

        expect(result).toEqual({
          contentX: 500, // 400 + 100 (scrollX)
          contentY: 250, // 200 + 50 (scrollY)
        })
      })

      it("should handle zero scroll values", () => {
        const noScrollWindow = { ...windowInfo, scrollX: 0, scrollY: 0 }
        const result = windowToContentCoordinates(400, 200, noScrollWindow)

        expect(result).toEqual({
          contentX: 400,
          contentY: 200,
        })
      })
    })
  })

  describe("round-trip coordinate conversion", () => {
    const windowInfo = {
      innerWidth: 1200,
      innerHeight: 800,
      scrollX: 100,
      scrollY: 50,
      devicePixelRatio: 2.0,
      screenX: 300,
      screenY: 100,
      outerWidth: 1220,
      outerHeight: 850,
    }

    it("should maintain coordinate integrity in round-trip conversion", () => {
      const originalScreenX = 800
      const originalScreenY = 400

      // Screen -> Window -> Screen
      const windowCoords = screenToWindowCoordinatesSync(
        originalScreenX,
        originalScreenY,
        windowInfo,
      )
      const backToScreen = windowToScreenCoordinatesSync(
        windowCoords.windowX,
        windowCoords.windowY,
        windowInfo,
      )

      expect(backToScreen.screenX).toBe(originalScreenX)
      expect(backToScreen.screenY).toBe(originalScreenY)
    })
  })
})
