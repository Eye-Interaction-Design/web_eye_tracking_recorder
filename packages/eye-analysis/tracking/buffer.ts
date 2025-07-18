// Gaze data buffering and batch processing

import type { GazePoint } from "../recorder/types"

interface BufferState {
  buffer: GazePoint[]
  flushInterval: number | null
  flushIntervalMs: number
  maxBufferSize: number
  onFlush: (data: GazePoint[]) => Promise<void>
  onError: (error: Error, data: GazePoint[]) => void
}

let bufferState: BufferState = {
  buffer: [],
  flushInterval: null,
  flushIntervalMs: 1000, // 1 second
  maxBufferSize: 100,
  onFlush: async () => {},
  onError: () => {},
}

/**
 * Add gaze data to buffer
 */
export const addToGazeBuffer = (gazePoint: GazePoint): void => {
  bufferState.buffer.push(gazePoint)

  // Flush if buffer is full
  if (bufferState.buffer.length >= bufferState.maxBufferSize) {
    flushGazeBuffer().catch(console.error)
  }
}

/**
 * Clear and return current buffer
 */
export const clearGazeBuffer = (): GazePoint[] => {
  const buffer = bufferState.buffer
  bufferState.buffer = []
  return buffer
}

/**
 * Start automatic buffer flushing
 */
export const startBufferFlush = (
  onFlush: (data: GazePoint[]) => Promise<void>,
  onError?: (error: Error, data: GazePoint[]) => void,
  intervalMs: number = 1000,
): void => {
  bufferState.onFlush = onFlush
  bufferState.onError =
    onError ||
    ((error, data) => {
      console.error("Buffer flush error:", error)
      // Re-add to buffer for retry
      bufferState.buffer.unshift(...data)
    })
  bufferState.flushIntervalMs = intervalMs

  bufferState.flushInterval = setInterval(() => {
    if (bufferState.buffer.length > 0) {
      flushGazeBuffer().catch(console.error)
    }
  }, intervalMs) as unknown as number
}

/**
 * Stop automatic buffer flushing
 */
export const stopBufferFlush = (): void => {
  if (bufferState.flushInterval) {
    clearInterval(bufferState.flushInterval)
    bufferState.flushInterval = null
  }
}

/**
 * Manually flush buffer
 */
export const flushGazeBuffer = async (): Promise<void> => {
  if (bufferState.buffer.length === 0) return

  const dataToFlush = clearGazeBuffer()

  try {
    await bufferState.onFlush(dataToFlush)
  } catch (error) {
    bufferState.onError(error as Error, dataToFlush)
  }
}

/**
 * Get current buffer state
 */
export const getBufferState = (): {
  bufferSize: number
  isAutoFlushActive: boolean
  flushIntervalMs: number
} => {
  return {
    bufferSize: bufferState.buffer.length,
    isAutoFlushActive: bufferState.flushInterval !== null,
    flushIntervalMs: bufferState.flushIntervalMs,
  }
}

/**
 * Configure buffer settings
 */
export const configureBuffer = (config: {
  maxBufferSize?: number
  flushIntervalMs?: number
}): void => {
  if (config.maxBufferSize !== undefined) {
    bufferState.maxBufferSize = config.maxBufferSize
  }
  if (config.flushIntervalMs !== undefined) {
    bufferState.flushIntervalMs = config.flushIntervalMs
  }
}

/**
 * Reset buffer state
 */
export const resetBuffer = (): void => {
  stopBufferFlush()
  bufferState.buffer = []
}
