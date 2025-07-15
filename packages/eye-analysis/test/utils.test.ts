import { describe, expect, it } from "vitest"
import {
  convertScreenToWindowCoordinates,
  generateSessionId,
  getBrowserWindowInfo,
  getScreenInfo,
} from "../utils"

describe("Utils", () => {
  describe("generateSessionId", () => {
    it("should generate a session ID with correct format", () => {
      const sessionId = generateSessionId()
      expect(sessionId).toMatch(/^session_\d{4}-\d{2}-\d{2}_\d{4}_[a-z0-9]{6}$/)
    })

    it("should generate unique session IDs", async () => {
      const id1 = generateSessionId()
      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10))
      const id2 = generateSessionId()
      expect(id1).not.toBe(id2)
    })
  })

  describe("getBrowserWindowInfo", () => {
    it("should return browser window information", () => {
      const windowInfo = getBrowserWindowInfo()
      expect(windowInfo).toHaveProperty("innerWidth")
      expect(windowInfo).toHaveProperty("innerHeight")
      expect(windowInfo).toHaveProperty("screenX")
      expect(windowInfo).toHaveProperty("screenY")
      expect(windowInfo).toHaveProperty("devicePixelRatio")
    })
  })

  describe("getScreenInfo", () => {
    it("should return screen information", () => {
      const screenInfo = getScreenInfo()
      expect(screenInfo).toHaveProperty("width")
      expect(screenInfo).toHaveProperty("height")
      expect(screenInfo).toHaveProperty("availWidth")
      expect(screenInfo).toHaveProperty("availHeight")
    })
  })

  describe("convertScreenToWindowCoordinates", () => {
    it("should convert screen coordinates to window coordinates", () => {
      const windowInfo = {
        innerWidth: 1200,
        innerHeight: 800,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1,
        screenX: 100,
        screenY: 50,
        outerWidth: 1220,
        outerHeight: 850,
      }

      const result = convertScreenToWindowCoordinates(500, 300, windowInfo)
      expect(result).toEqual({ windowX: 400, windowY: 250 })
    })
  })
})
