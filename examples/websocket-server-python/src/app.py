from typing import Optional, List
import uvicorn
from fastapi import FastAPI, WebSocket, HTTPException
from starlette.middleware.cors import CORSMiddleware

import json
import asyncio
from time import sleep

from .tobii_pro_eye_tracker import TobiiProEyeTracker, GazePoint, tr
from .models import TobiiGazeData

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


eyetracker: Optional[TobiiProEyeTracker] = None
connected_clients: List[WebSocket] = []
main_loop = None


def handle_gaze_data(gaze_data: TobiiGazeData):
    broadcast_gaze_data(gaze_data)


def wait_for_device():
    global eyetracker

    while True:
        if eyetracker:
            break

        devices = tr.find_all_eyetrackers()
        if devices:
            eyetracker = TobiiProEyeTracker(devices[0])
            eyetracker.on_gaze_data = handle_gaze_data
            eyetracker.subscribe()

        sleep(1)


def broadcast_gaze_data(gaze_data: TobiiGazeData):
    print("[GazeData]", gaze_data)
    if not connected_clients or not main_loop:
        return

    # Get individual eye gaze points from the structured data
    left_eye_screen_x = gaze_data.left_eye.gaze_point_on_display_area[0]
    left_eye_screen_y = gaze_data.left_eye.gaze_point_on_display_area[1]
    right_eye_screen_x = gaze_data.right_eye.gaze_point_on_display_area[0]
    right_eye_screen_y = gaze_data.right_eye.gaze_point_on_display_area[1]

    # Calculate average gaze point
    screen_x = (left_eye_screen_x + right_eye_screen_x) / 2
    screen_y = (left_eye_screen_y + right_eye_screen_y) / 2
    
    # Get eye position data if available
    left_eye_position = None
    right_eye_position = None
    if eyetracker:
        left_eye_position = eyetracker.left_eye_position
        right_eye_position = eyetracker.right_eye_position
    
    # Create message in GazePointInput format with additional fields
    message_data = {
        "deviceTimeStamp": gaze_data.device_time_stamp,
        "systemTimestamp": gaze_data.system_time_stamp,
        "normalized": True,  # Tobii provides normalized coordinates
        "screenX": screen_x,
        "screenY": screen_y,
        "leftEye": {
            "screenX": left_eye_screen_x,
            "screenY": left_eye_screen_y,
            "positionX": left_eye_position.x if left_eye_position and left_eye_position.is_valid else None,
            "positionY": left_eye_position.y if left_eye_position and left_eye_position.is_valid else None,
            "positionZ": left_eye_position.z if left_eye_position and left_eye_position.is_valid else None,
            "pupilSize": gaze_data.left_eye.pupil_diameter if gaze_data.left_eye.is_pupil_valid else None
        },
        "rightEye": {
            "screenX": right_eye_screen_x,
            "screenY": right_eye_screen_y,
            "positionX": right_eye_position.x if right_eye_position and right_eye_position.is_valid else None,
            "positionY": right_eye_position.y if right_eye_position and right_eye_position.is_valid else None,
            "positionZ": right_eye_position.z if right_eye_position and right_eye_position.is_valid else None,
            "pupilSize": gaze_data.right_eye.pupil_diameter if gaze_data.right_eye.is_pupil_valid else None
        }
    }
    
    message = json.dumps(message_data)
    disconnected_clients = []

    for client in connected_clients:
        try:
            print("Sending message to client:", message)
            asyncio.run_coroutine_threadsafe(client.send_text(message), main_loop)
        except Exception as e:
            print(f"Error sending to client: {e}")
            disconnected_clients.append(client)

    # Remove disconnected clients
    for client in disconnected_clients:
        connected_clients.remove(client)


@app.websocket("/eye_tracking")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)

    try:
        while True:
            data = await websocket.receive_text()
            print("Received:", data)
            await websocket.send_text('{"status": "ok"}')
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if websocket in connected_clients:
            connected_clients.remove(websocket)
        await websocket.close()


@app.post("/calibration:start")
async def calibration_start():
    if not eyetracker:
        raise HTTPException(status_code=400, detail="CONNECT EYETRACKER FIRST")

    try:
        eyetracker.calibration.enter_calibration_mode()

        return { "message": "ok" }
    except tr.EyeTrackerInvalidOperationError:
        print("Already calibration? leaved.")
        eyetracker.calibration.leave_calibration_mode()
        eyetracker.calibration.enter_calibration_mode()

        return { "message": "ok" }


@app.post("/calibration:collect")
async def calibration_collect(point: GazePoint):
    if not eyetracker:
        raise HTTPException(status_code=400, detail="CONNECT EYETRACKER FIRST")

    print("Collect:", point.x, point.y)

    if eyetracker.calibration.collect_data(point.x, point.y) == tr.CALIBRATION_STATUS_SUCCESS:
        return { "message": "ok" }
    else:
        return { "message": "failed" }


@app.post("/calibration:result")
async def calibration_result(force: bool = False):
    if not eyetracker:
        raise HTTPException(status_code=400, detail="CONNECT EYETRACKER FIRST")

    calibration_result = eyetracker.calibration.compute_and_apply()

    # print calibration result
    print(calibration_result.status, len(calibration_result.calibration_points))
    for point in calibration_result.calibration_points:
        print(point.position_on_display_area, ":")
        for sample in point.calibration_samples:
            print(sample.left_eye.position_on_display_area, sample.right_eye.position_on_display_area)

    if force or calibration_result.status == tr.CALIBRATION_STATUS_SUCCESS:
        eyetracker.calibration.leave_calibration_mode()

        return { "message": "ok" }
    else:
        recalibration_points = []
        for recalibrate_point in recalibration_points:
            eyetracker.calibration.discard_data(recalibrate_point[0], recalibrate_point[1])

        return { "message": "failed", "recalibrate": recalibration_points }


@app.on_event("startup")
async def startup():
    global main_loop
    main_loop = asyncio.get_event_loop()
    asyncio.create_task(asyncio.to_thread(wait_for_device))


@app.on_event("shutdown")
async def shutdown():
    if eyetracker:
        eyetracker.unsubscribe()


def start():
    uvicorn.run("src.app:app", port=8000, reload=True)
