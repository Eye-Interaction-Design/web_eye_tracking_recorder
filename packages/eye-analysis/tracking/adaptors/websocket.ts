// WebSocket tracking adaptor implementation

import type { GazePointInput } from "../../recorder/types"
import { handleGazeData } from "../manager"
import type {
  ConnectionOptions,
  DataProcessingAdaptor,
  TrackingStatus,
} from "../types"
import {
  initializeAdaptorState,
  updateAdaptorStatus,
  startTrackingSession,
  stopTrackingSession,
  handleTrackingError,
  sendTrackingMessage,
  normalizeWebSocketURL,
} from "../common"

/**
 * WebSocket tracking adaptor options
 */
export interface WebSocketAdaptorOptions extends ConnectionOptions {
  dataProcessor?: (rawData: unknown) => GazePointInput | null
  reconnectInterval?: number
  sessionId?: string
  config?: {
    samplingRate?: number
    calibrationPoints?: number
    trackingMode?: string
  }
  urlSuffix?: string // e.g., '/eye_tracking'
}

/**
 * Default data processor for WebSocket messages
 * Supports comprehensive eye tracking data including position and rotation
 */
export const defaultWebSocketDataProcessor = (
  rawData: unknown,
): GazePointInput | null => {
  if (!rawData || typeof rawData !== "object") {
    return null
  }

  const data = rawData as Record<string, unknown>

  // Extract left eye data
  const leftEyeData = data.leftEye as Record<string, unknown> | undefined
  const leftEye = leftEyeData && {
    screenX: leftEyeData.screenX as number,
    screenY: leftEyeData.screenY as number,
    positionX: leftEyeData.positionX as number | undefined,
    positionY: leftEyeData.positionY as number | undefined,
    positionZ: leftEyeData.positionZ as number | undefined,
    pupilSize: leftEyeData.pupilSize as number | undefined,
    rotateX: leftEyeData.rotateX as number | undefined,
    rotateY: leftEyeData.rotateY as number | undefined,
    rotateZ: leftEyeData.rotateZ as number | undefined,
  }

  // Extract right eye data
  const rightEyeData = data.rightEye as Record<string, unknown> | undefined
  const rightEye = rightEyeData && {
    screenX: rightEyeData.screenX as number,
    screenY: rightEyeData.screenY as number,
    positionX: rightEyeData.positionX as number | undefined,
    positionY: rightEyeData.positionY as number | undefined,
    positionZ: rightEyeData.positionZ as number | undefined,
    pupilSize: rightEyeData.pupilSize as number | undefined,
    rotateX: rightEyeData.rotateX as number | undefined,
    rotateY: rightEyeData.rotateY as number | undefined,
    rotateZ: rightEyeData.rotateZ as number | undefined,
  }

  return {
    deviceTimeStamp: data.deviceTimeStamp as number | undefined,
    systemTimestamp: data.systemTimestamp as number | undefined,
    normalized: data.normalized as boolean | undefined,
    screenX: data.screenX as number,
    screenY: data.screenY as number,
    confidence: data.confidence as number,
    leftEye,
    rightEye,
  }
}

/**
 * Create a WebSocket tracking adaptor
 */
export const websocketTrackingAdaptor = (
  url: string,
  options: WebSocketAdaptorOptions = {},
): DataProcessingAdaptor => {
  let websocket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const adaptorId = `websocket-${url}`
  const wsUrl = normalizeWebSocketURL(url, options.urlSuffix)

  // Initialize common state
  const state = initializeAdaptorState(adaptorId)

  const adaptor: DataProcessingAdaptor = {
    id: `websocket-${url}`,
    name: `WebSocket Tracking (${url})`,

    async connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          websocket = new WebSocket(wsUrl)

          const timeout = setTimeout(() => {
            websocket?.close()
            reject(new Error("Connection timeout"))
          }, options.timeout || 10000)

          websocket.onopen = () => {
            clearTimeout(timeout)

            updateAdaptorStatus(adaptorId, {
              connected: true,
              tracking: true,
              quality: "good",
            })

            // Start tracking session if sessionId is provided
            if (options.sessionId) {
              startTrackingSession(adaptorId, options.sessionId, options.config)
              sendTrackingMessage(
                websocket,
                "start_tracking",
                options.sessionId,
                options.config,
              )
            }

            adaptor.onStatusChange?.(state.status)
            resolve()
          }

          websocket.onerror = () => {
            clearTimeout(timeout)

            const error = new Error("WebSocket connection failed")
            handleTrackingError(adaptorId, error)

            updateAdaptorStatus(adaptorId, {
              connected: false,
              tracking: false,
              quality: "unavailable",
              message: "Connection failed",
            })

            adaptor.onStatusChange?.(state.status)
            adaptor.onError?.(error)
            reject(error)
          }

          websocket.onmessage = async (event) => {
            try {
              const rawData = JSON.parse(event.data)
              const gazeInput = await adaptor.processRawData(rawData)
              if (gazeInput) {
                await handleGazeData(gazeInput, adaptor.id)
              }
            } catch (error) {
              handleTrackingError(adaptorId, error as Error)
            }
          }

          websocket.onclose = () => {
            updateAdaptorStatus(adaptorId, {
              connected: false,
              tracking: false,
              quality: "unavailable",
              message: "Disconnected",
            })

            stopTrackingSession(adaptorId)
            adaptor.onStatusChange?.(state.status)

            // Auto-reconnect if enabled
            if (options.autoReconnect && reconnectTimer === null) {
              reconnectTimer = setTimeout(() => {
                reconnectTimer = null
                adaptor.connect().catch(console.error)
              }, options.reconnectInterval || 5000)
            }
          }
        } catch (error) {
          reject(error)
        }
      })
    },

    async disconnect(): Promise<void> {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }

      if (websocket) {
        // Send stop tracking message if sessionId is provided
        if (options.sessionId) {
          sendTrackingMessage(websocket, "stop_tracking", options.sessionId)
        }

        websocket.close()
        websocket = null
      }

      stopTrackingSession(adaptorId)
      updateAdaptorStatus(adaptorId, {
        connected: false,
        tracking: false,
        quality: "unavailable",
      })
      adaptor.onStatusChange?.(state.status)
    },

    isConnected(): boolean {
      return websocket?.readyState === WebSocket.OPEN
    },

    getStatus(): TrackingStatus {
      return state.status
    },

    async processRawData(rawData: unknown): Promise<GazePointInput | null> {
      const processor = options.dataProcessor || defaultWebSocketDataProcessor
      return processor(rawData)
    },
  }

  return adaptor
}
