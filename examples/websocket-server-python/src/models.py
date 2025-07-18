from dataclasses import dataclass
from typing import Dict, Optional, Tuple
from math import isnan


def _nan_to_none(value):
    return None if isnan(value) else value


@dataclass
class EyePosition:
    x: float
    y: float
    z: float

    @property
    def is_valid(self) -> bool:
        return not (isnan(self.x) or isnan(self.y) or isnan(self.z))

    def to_dict(self) -> Dict[str, Optional[float]]:
        return {"x": _nan_to_none(self.x), "y": _nan_to_none(self.y), "z": _nan_to_none(self.z)}


@dataclass
class GazePoint:
    x: float
    y: float

    @property
    def is_valid(self) -> bool:
        return not (isnan(self.x) or isnan(self.y))

    def to_dict(self) -> Dict[str, Optional[float]]:
        return {"x": _nan_to_none(self.x), "y": _nan_to_none(self.y)}


@dataclass
class EyeData:
    gaze_point_on_display_area: Tuple[float, float]
    gaze_point_in_user_coordinate_system: Tuple[float, float, float]
    gaze_point_validity: int
    pupil_diameter: float
    pupil_validity: int
    gaze_origin_in_user_coordinate_system: Tuple[float, float, float]
    gaze_origin_validity: int

    @property
    def is_gaze_valid(self) -> bool:
        return self.gaze_point_validity == 1

    @property
    def is_pupil_valid(self) -> bool:
        return self.pupil_validity == 1

    @property
    def is_origin_valid(self) -> bool:
        return self.gaze_origin_validity == 1


@dataclass
class UserPositionData:
    left_user_position: Tuple[float, float, float]
    left_user_position_validity: int
    right_user_position: Tuple[float, float, float]
    right_user_position_validity: int

    @property
    def is_left_valid(self) -> bool:
        return self.left_user_position_validity == 1

    @property
    def is_right_valid(self) -> bool:
        return self.right_user_position_validity == 1


@dataclass
class TobiiGazeData:
    device_time_stamp: int
    system_time_stamp: int
    left_eye: EyeData
    right_eye: EyeData

    @classmethod
    def from_dict(cls, data: Dict) -> 'TobiiGazeData':
        left_eye = EyeData(
            gaze_point_on_display_area=data['left_gaze_point_on_display_area'],
            gaze_point_in_user_coordinate_system=data['left_gaze_point_in_user_coordinate_system'],
            gaze_point_validity=data['left_gaze_point_validity'],
            pupil_diameter=data['left_pupil_diameter'],
            pupil_validity=data['left_pupil_validity'],
            gaze_origin_in_user_coordinate_system=data['left_gaze_origin_in_user_coordinate_system'],
            gaze_origin_validity=data['left_gaze_origin_validity']
        )
        
        right_eye = EyeData(
            gaze_point_on_display_area=data['right_gaze_point_on_display_area'],
            gaze_point_in_user_coordinate_system=data['right_gaze_point_in_user_coordinate_system'],
            gaze_point_validity=data['right_gaze_point_validity'],
            pupil_diameter=data['right_pupil_diameter'],
            pupil_validity=data['right_pupil_validity'],
            gaze_origin_in_user_coordinate_system=data['right_gaze_origin_in_user_coordinate_system'],
            gaze_origin_validity=data['right_gaze_origin_validity']
        )
        
        return cls(
            device_time_stamp=data['device_time_stamp'],
            system_time_stamp=data['system_time_stamp'],
            left_eye=left_eye,
            right_eye=right_eye
        )

