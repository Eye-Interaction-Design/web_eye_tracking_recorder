import { vi } from "vitest"

// Remove jest-dom for now to focus on core functionality
// import '@testing-library/jest-dom'

// Mock eye-analysis package functions
vi.mock("eye-analysis", () => ({
  initialize: vi.fn(),
  createSession: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  addGazeData: vi.fn(),
  addEvent: vi.fn(),
  downloadSession: vi.fn(),
  getCurrentSession: vi.fn(() => null),
  subscribe: vi.fn(),
  getCurrentState: vi.fn(() => ({
    status: "idle",
    isRecording: false,
    currentSession: null,
    recordingDuration: 0,
    gazeDataCount: 0,
    eventsCount: 0,
    videoChunksCount: 0,
    error: null,
    lastUpdate: Date.now(),
    recordingConfig: undefined,
    startBrowserTime: undefined,
  })),
  isRecording: vi.fn(() => false),
}))

// Mock the getState and subscribe functions from state module
vi.mock("../../eye-analysis/recorder/state", () => ({
  getState: vi.fn(() => ({
    status: "idle",
    isRecording: false,
    currentSession: null,
    recordingDuration: 0,
    gazeDataCount: 0,
    eventsCount: 0,
    videoChunksCount: 0,
    error: null,
    lastUpdate: Date.now(),
    recordingConfig: undefined,
    startBrowserTime: undefined,
  })),
  subscribe: vi.fn(),
}))

// Mock the addEvent function from core module
vi.mock("../../eye-analysis/recorder/core", () => ({
  addEvent: vi.fn(),
}))

// Mock React
global.React = require("react")
