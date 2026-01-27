from dataclasses import dataclass
from datetime import datetime
from typing import Literal
import pint
import numpy as np
from mechaphlowers import ThermalEngine, units

Q_ = pint.UnitRegistry().Quantity

@dataclass
class TemperatureCalculationInputs:
    cableName: str
    ambientTemperature: float
    longitude: float
    latitude: float
    transit: float
    skyCover: str
    altitude: float
    azimuth: float
    date: datetime
    time: datetime
    windSpeed: float
    windSpeedUnit: Literal['kmh', 'ms']
    windDirection: str


def default_converter(value, _ignored1, _ignored2):
    if value.constructor.name == "Date":
        return datetime.fromtimestamp(value.valueOf()/1000)
    return value

def temperature_calculation(js_inputs):
    global engine
    python_inputs = js_inputs.to_py(default_converter=default_converter)
    temp_inputs = TemperatureCalculationInputs(**python_inputs)
    thermal_engine = ThermalEngine()
    unit_map = {"kmh": "km/h", "ms": "m/s"}
    wind_speed = units(temp_inputs.windSpeed, unit_map[temp_inputs.windSpeedUnit]).to("m/s").m
    direction_map = {
        'North': 0,
        'North-East': 45,
        'East': 90,
        'South-East': 135,
        'South': 180,
        'South-West': 225,
        'West': 270,
        'North-West': 315,
    }
    wind_angle = direction_map[temp_inputs.windDirection]
    thermal_engine.set(
        cable_array=engine.cable_array,
        latitude=np.array([temp_inputs.latitude]),
        longitude=np.array([temp_inputs.longitude]),
        altitude=np.array([temp_inputs.altitude]),
        azimuth=np.array([temp_inputs.azimuth]),
        month=np.array([temp_inputs.date.month]),
        day=np.array([temp_inputs.date.day]),
        hour=np.array([temp_inputs.time.hour]),
        intensity=np.array([temp_inputs.transit]),
        ambient_temp=np.array([temp_inputs.ambientTemperature]),
        wind_speed=np.array([wind_speed]),
        wind_angle=np.array([wind_angle]),
    )
    temperature_result = thermal_engine.steady_temperature()
    print(temperature_result)
    return {
        "cableSolarFlux": None,
        "cableTemperature": temperature_result.data["t_core"].iloc[0],
        "cableTemperatureUncertainty": None
    }