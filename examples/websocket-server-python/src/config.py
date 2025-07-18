# Configuration for WebSocket Eye Tracking Server

# Screen resolution settings
# Adjust these values to match your screen resolution
SCREEN_WIDTH = 1920
SCREEN_HEIGHT = 1080

# Eye tracking settings
DEFAULT_CONFIDENCE = 0.8
DEFAULT_PUPIL_SIZE = 3.0  # mm

# WebSocket settings
WEBSOCKET_PORT = 8000
WEBSOCKET_HOST = "localhost"

# Eye tracker settings
CALIBRATION_POINTS = [(0.5, 0.5), (0.1, 0.1), (0.1, 0.9), (0.9, 0.1), (0.9, 0.9)]