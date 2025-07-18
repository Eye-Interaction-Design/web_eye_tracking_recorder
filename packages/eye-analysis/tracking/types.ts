// Tracking adaptor types and interfaces

import type { GazePoint, GazePointInput } from "../recorder/types"

// Tracking status
export interface TrackingStatus {
  connected: boolean
  tracking: boolean
  quality: "excellent" | "good" | "poor" | "unavailable"
  message?: string
  metadata?: Record<string, unknown>
}

// Connection options
export interface ConnectionOptions {
  timeout?: number
  retryAttempts?: number
  retryDelay?: number
  autoReconnect?: boolean
}

// Core adaptor interface
export interface TrackingAdaptor {
  readonly id: string
  readonly name: string
  connect(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  getStatus(): TrackingStatus
  onStatusChange?: (status: TrackingStatus) => void
  onError?: (error: Error) => void
}

// Data processing adaptor interface
export interface DataProcessingAdaptor extends TrackingAdaptor {
  processRawData(rawData: unknown): Promise<GazePointInput | null>
}

// Function-based adaptor interface
export interface FunctionBasedAdaptor extends TrackingAdaptor {
  setupFunction: (
    onGaze: (gazePoint: GazePointInput) => void,
  ) => (() => void) | undefined
}

// Adaptor factory function type
export type AdaptorFactory<T extends TrackingAdaptor = TrackingAdaptor> = (
  ...args: unknown[]
) => T

// Event callbacks
export type StatusChangeCallback = (status: TrackingStatus) => void
export type ErrorCallback = (error: Error) => void
export type GazeCallback = (gazePoint: GazePoint) => void

// Manager state
export interface AdaptorManagerState {
  adaptors: Map<string, TrackingAdaptor>
  activeAdaptors: Set<string>
  statusCallbacks: Map<string, StatusChangeCallback>
  gazeCallbacks: Map<string, GazeCallback>
}
