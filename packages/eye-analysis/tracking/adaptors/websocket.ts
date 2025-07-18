// WebSocket tracking adaptor implementation

import type { GazePointInput } from "../../recorder/types"
import { handleGazeData } from "../manager"
import type {
  ConnectionOptions,
  DataProcessingAdaptor,
  TrackingStatus,
} from "../types"

/**
 * WebSocket tracking adaptor options
 */
export interface WebSocketAdaptorOptions extends ConnectionOptions {
  dataProcessor?: (rawData: unknown) => GazePointInput | null
  reconnectInterval?: number
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
  const leftEye = {
    screenX: (leftEyeData?.screenX as number) || (data.screenX as number) || 0,
    screenY: (leftEyeData?.screenY as number) || (data.screenY as number) || 0,
    positionX: leftEyeData?.positionX as number | undefined,
    positionY: leftEyeData?.positionY as number | undefined,
    positionZ: leftEyeData?.positionZ as number | undefined,
    pupilSize: (leftEyeData?.pupilSize as number) || 3,
    rotateX: leftEyeData?.rotateX as number | undefined,
    rotateY: leftEyeData?.rotateY as number | undefined,
    rotateZ: leftEyeData?.rotateZ as number | undefined,
  }

  // Extract right eye data
  const rightEyeData = data.rightEye as Record<string, unknown> | undefined
  const rightEye = {
    screenX: (rightEyeData?.screenX as number) || (data.screenX as number) || 0,
    screenY: (rightEyeData?.screenY as number) || (data.screenY as number) || 0,
    positionX: rightEyeData?.positionX as number | undefined,
    positionY: rightEyeData?.positionY as number | undefined,
    positionZ: rightEyeData?.positionZ as number | undefined,
    pupilSize: (rightEyeData?.pupilSize as number) || 3,
    rotateX: rightEyeData?.rotateX as number | undefined,
    rotateY: rightEyeData?.rotateY as number | undefined,
    rotateZ: rightEyeData?.rotateZ as number | undefined,
  }

  return {
    deviceTimeStamp: data.deviceTimeStamp as number | undefined,
    systemTimestamp: data.systemTimestamp as number | undefined,
    normalized: data.normalized as boolean | undefined,
    screenX: (data.screenX as number) || 0,
    screenY: (data.screenY as number) || 0,
    confidence: (data.confidence as number) || 0.5,
    leftEye: leftEyeData ? leftEye : undefined,
    rightEye: rightEyeData ? rightEye : undefined,
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
  let status: TrackingStatus = {
    connected: false,
    tracking: false,
    quality: "unavailable",
  }

  const adaptor: DataProcessingAdaptor = {
    id: `websocket-${url}`,
    name: `WebSocket Tracking (${url})`,

    async connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        try {
          websocket = new WebSocket(url)

          const timeout = setTimeout(() => {
            websocket?.close()
            reject(new Error("Connection timeout"))
          }, options.timeout || 10000)

          websocket.onopen = () => {
            clearTimeout(timeout)
            status = { connected: true, tracking: true, quality: "good" }
            adaptor.onStatusChange?.(status)
            resolve()
          }

          websocket.onerror = () => {
            clearTimeout(timeout)
            status = {
              connected: false,
              tracking: false,
              quality: "unavailable",
              message: "Connection failed",
            }
            adaptor.onStatusChange?.(status)
            adaptor.onError?.(new Error("WebSocket connection failed"))
            reject(new Error("WebSocket connection failed"))
          }

          websocket.onmessage = async (event) => {
            try {
              const rawData = JSON.parse(event.data)
              const gazeInput = await adaptor.processRawData(rawData)
              if (gazeInput) {
                await handleGazeData(gazeInput, adaptor.id)
              }
            } catch (error) {
              console.error("Failed to process WebSocket message:", error)
            }
          }

          websocket.onclose = () => {
            status = {
              connected: false,
              tracking: false,
              quality: "unavailable",
              message: "Disconnected",
            }
            adaptor.onStatusChange?.(status)

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
        websocket.close()
        websocket = null
      }

      status = { connected: false, tracking: false, quality: "unavailable" }
      adaptor.onStatusChange?.(status)
    },

    isConnected(): boolean {
      return websocket?.readyState === WebSocket.OPEN
    },

    getStatus(): TrackingStatus {
      return status
    },

    async processRawData(rawData: unknown): Promise<GazePointInput | null> {
      const processor = options.dataProcessor || defaultWebSocketDataProcessor
      return processor(rawData)
    },
  }

  return adaptor
}
