from typing import Callable, Optional, Dict, Any
import tobii_research as tr
from math import isnan, nan
from time import time

from .gaze_filter import OneEuroFilter, IvtFilter
from .models import EyePosition, GazePoint, TobiiGazeData, UserPositionData
from .config import CALIBRATION_POINTS

oe_filter_x = OneEuroFilter()
oe_filter_y = OneEuroFilter()
ivt_filter = IvtFilter(v_threshold=2)

# Updated callback type to include full gaze data
GazeCallback = Optional[Callable[[TobiiGazeData], None]]

class TobiiProEyeTracker:
    device: tr.EyeTracker
    calibration: tr.ScreenBasedCalibration
    serial_number: str
    on_gaze_data: GazeCallback = None

    def __init__(self, device: tr.EyeTracker) -> None:
        self.output_file = ""
        self.current_timestamp = None
        self.user_exists = False
        self.gaze_point = GazePoint(x=nan, y=nan)
        self.fixation_point = GazePoint(x=nan, y=nan)
        self.left_gaze_point = GazePoint(x=nan, y=nan)
        self.right_gaze_point = GazePoint(x=nan, y=nan)
        self.left_eye_position = EyePosition(x=nan, y=nan, z=nan)
        self.right_eye_position = EyePosition(x=nan, y=nan, z=nan)

        # Store latest user position data
        self.user_position_data: Optional[UserPositionData] = None

        self.device = device
        self.calibration = tr.ScreenBasedCalibration(device)


    def gaze_data_callback(self, gaze_data_raw):
        # Use system timestamp from eye tracker
        self.current_timestamp = gaze_data_raw["system_time_stamp"] / 1000000.0  # Convert to seconds

        # Create structured gaze data
        gaze_data = TobiiGazeData.from_dict(gaze_data_raw)

        # Get individual eye gaze points
        left_x, left_y = gaze_data.left_eye.gaze_point_on_display_area
        right_x, right_y = gaze_data.right_eye.gaze_point_on_display_area

        # Store individual eye gaze points
        self.left_gaze_point = GazePoint(x=left_x, y=left_y)
        self.right_gaze_point = GazePoint(x=right_x, y=right_y)

        # Calculate average gaze point
        x = (left_x + right_x) / 2
        y = (left_y + right_y) / 2

        if isnan(x) or isnan(y):
            self.gaze_point = GazePoint(x=x, y=y)
            self.fixation_point = GazePoint(x=x, y=y)
            return

        # Jitter filter
        x = oe_filter_x(self.current_timestamp, x)
        y = oe_filter_y(self.current_timestamp, y)
        self.gaze_point = GazePoint(x=x, y=y)

        # Fixation filter
        fp = ivt_filter(self.current_timestamp / 1000000, x, y)
        self.fixation_point = GazePoint(x=fp[0], y=fp[1])

        if self.on_gaze_data:
            self.on_gaze_data(gaze_data)


    def user_position_guide_callback(self, user_position_guide_raw):
        # Store latest user position data
        self.user_position_data = UserPositionData(
            left_user_position=user_position_guide_raw["left_user_position"],
            left_user_position_validity=user_position_guide_raw["left_user_position_validity"],
            right_user_position=user_position_guide_raw["right_user_position"],
            right_user_position_validity=user_position_guide_raw["right_user_position_validity"]
        )

        self.user_exists = self.user_position_data.is_left_valid or self.user_position_data.is_right_valid
        if not self.user_exists:
            self.left_eye_position = EyePosition(x=nan, y=nan, z=nan)
            self.right_eye_position = EyePosition(x=nan, y=nan, z=nan)
            return

        left = self.user_position_data.left_user_position
        right = self.user_position_data.right_user_position

        self.left_eye_position = EyePosition(x=1 - left[0], y=left[1], z=left[2])
        self.right_eye_position = EyePosition(x=1 - right[0], y=right[1], z=right[2])


    def subscribe(self) -> None:
        if self.device:
            self.device.subscribe_to(tr.EYETRACKER_GAZE_DATA, self.gaze_data_callback, as_dictionary=True)
            self.device.subscribe_to(tr.EYETRACKER_USER_POSITION_GUIDE, self.user_position_guide_callback, as_dictionary=True)


    def unsubscribe(self) -> None:
        if self.device:
            self.device.unsubscribe_from(tr.EYETRACKER_GAZE_DATA, self.gaze_data_callback)
            self.device.unsubscribe_from(tr.EYETRACKER_USER_POSITION_GUIDE, self.user_position_guide_callback)
