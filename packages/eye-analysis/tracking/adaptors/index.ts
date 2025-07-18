// Tracking adaptors - all available adaptor implementations

// WebSocket adaptor
export {
  websocketTrackingAdaptor,
  defaultWebSocketDataProcessor,
  type WebSocketAdaptorOptions,
} from "./websocket"

// Mouse adaptor
export {
  mouseTrackingAdaptor,
  getCurrentMousePosition,
  validateMouseAdaptorOptions,
  type MouseAdaptorOptions,
} from "./mouse"

// Custom adaptor factory
export {
  createCustomAdaptor,
  createDataDrivenAdaptor,
  createTimerAdaptor,
  createWebRTCAdaptor,
  validateCustomAdaptorConfig,
  getExampleAdaptorConfigs,
  type CustomAdaptorSetupFunction,
  type CustomAdaptorOptions,
} from "./custom"
