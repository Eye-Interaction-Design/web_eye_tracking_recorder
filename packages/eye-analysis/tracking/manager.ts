// Tracking adaptor manager - function-based implementation

import { interactionState } from "../interaction"
import { addGazeData } from "../recorder/core"
import type { GazePointInput } from "../recorder/types"
import type {
  AdaptorManagerState,
  GazeCallback,
  StatusChangeCallback,
  TrackingAdaptor,
  TrackingStatus,
} from "./types"

// Global state
const managerState: AdaptorManagerState = {
  adaptors: new Map(),
  activeAdaptors: new Set(),
  statusCallbacks: new Map(),
  gazeCallbacks: new Map(),
}

/**
 * Connect a tracking adaptor
 */
export const connectTrackingAdaptor = async (
  adaptor: TrackingAdaptor,
): Promise<void> => {
  const existingAdaptor = managerState.adaptors.get(adaptor.id)
  if (existingAdaptor?.isConnected()) {
    await existingAdaptor.disconnect()
  }

  managerState.adaptors.set(adaptor.id, adaptor)

  // Set up callbacks
  adaptor.onStatusChange = (status) => {
    managerState.statusCallbacks.get(adaptor.id)?.(status)
  }

  adaptor.onError = (error) => {
    console.error(`Adaptor ${adaptor.name} error:`, error)
    managerState.activeAdaptors.delete(adaptor.id)
  }

  await adaptor.connect()
  managerState.activeAdaptors.add(adaptor.id)

  console.log(`Connected adaptor: ${adaptor.name}`)
}

/**
 * Disconnect a tracking adaptor
 */
export const disconnectTrackingAdaptor = async (
  adaptorId: string,
): Promise<void> => {
  const adaptor = managerState.adaptors.get(adaptorId)
  if (adaptor) {
    await adaptor.disconnect()
    managerState.activeAdaptors.delete(adaptorId)
    managerState.gazeCallbacks.delete(adaptorId)
    managerState.statusCallbacks.delete(adaptorId)
    console.log(`Disconnected adaptor: ${adaptor.name}`)
  }
}

/**
 * Disconnect all tracking adaptors
 */
export const disconnectAllTrackingAdaptors = async (): Promise<void> => {
  await Promise.all(
    Array.from(managerState.activeAdaptors).map((id) =>
      disconnectTrackingAdaptor(id),
    ),
  )
}

/**
 * Get active tracking adaptors
 */
export const getActiveTrackingAdaptors = (): TrackingAdaptor[] => {
  return Array.from(managerState.activeAdaptors)
    .map((id) => managerState.adaptors.get(id))
    .filter((adaptor): adaptor is TrackingAdaptor => Boolean(adaptor))
}

/**
 * Get tracking adaptor status
 */
export const getTrackingAdaptorStatus = (
  adaptorId: string,
): TrackingStatus | null => {
  const adaptor = managerState.adaptors.get(adaptorId)
  return adaptor ? adaptor.getStatus() : null
}

/**
 * Set status change callback for an adaptor
 */
export const onTrackingAdaptorStatusChange = (
  adaptorId: string,
  callback: StatusChangeCallback,
): void => {
  managerState.statusCallbacks.set(adaptorId, callback)
}

/**
 * Set gaze callback for an adaptor
 */
export const onTrackingAdaptorGaze = (
  adaptorId: string,
  callback: GazeCallback,
): void => {
  managerState.gazeCallbacks.set(adaptorId, callback)
}

/**
 * Handle gaze data from any adaptor
 */
export const handleGazeData = async (
  gazeInput: GazePointInput,
  adaptorId: string,
): Promise<void> => {
  try {
    const gazePoint = await addGazeData(gazeInput)

    // Trigger global callback
    interactionState.onGazeDataCallback?.(gazePoint)

    // Trigger adaptor-specific callback
    managerState.gazeCallbacks.get(adaptorId)?.(gazePoint)
  } catch (error) {
    console.error(`Failed to process gaze data from ${adaptorId}:`, error)
  }
}

/**
 * Get current tracking mode
 */
export const getCurrentTrackingMode = (): string => {
  const active = getActiveTrackingAdaptors()
  if (active.length === 0) return "idle"
  if (active.length === 1) return active[0].name
  return `multiple (${active.length})`
}

/**
 * Get overall tracking quality
 */
export const getTrackingQuality = ():
  | "excellent"
  | "good"
  | "poor"
  | "unavailable" => {
  const active = getActiveTrackingAdaptors()
  if (active.length === 0) return "unavailable"

  const qualities = active.map((a) => a.getStatus().quality)
  if (qualities.includes("excellent")) return "excellent"
  if (qualities.includes("good")) return "good"
  if (qualities.includes("poor")) return "poor"
  return "unavailable"
}

/**
 * Check if any tracking is active
 */
export const isTrackingActive = (): boolean => {
  return getActiveTrackingAdaptors().some((adaptor) => adaptor.isConnected())
}

/**
 * Get all adaptors (active and inactive)
 */
export const getAllTrackingAdaptors = (): TrackingAdaptor[] => {
  return Array.from(managerState.adaptors.values())
}

/**
 * Reset manager state (for testing)
 */
export const resetTrackingManager = (): void => {
  managerState.adaptors.clear()
  managerState.activeAdaptors.clear()
  managerState.statusCallbacks.clear()
  managerState.gazeCallbacks.clear()
}
