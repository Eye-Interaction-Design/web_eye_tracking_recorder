import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock eye-analysis package functions
vi.mock('eye-analysis', () => ({
  initialize: vi.fn(),
  createSession: vi.fn(),
  startRecording: vi.fn(),
  stopRecording: vi.fn(),
  addGazeData: vi.fn(),
  addEvent: vi.fn(),
  subscribe: vi.fn(),
  getCurrentState: vi.fn(() => ({
    status: 'idle',
    isRecording: false,
    currentSession: null,
    recordingDuration: 0,
    gazeDataCount: 0,
    eventsCount: 0,
    error: null
  })),
  isRecording: vi.fn(() => false),
  getCurrentSession: vi.fn(() => null),
  downloadSessionAsZip: vi.fn(),
  saveExperimentData: vi.fn()
}))

// Mock React
global.React = require('react')