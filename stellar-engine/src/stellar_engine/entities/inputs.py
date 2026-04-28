# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import datetime
import inspect
from dataclasses import dataclass
from typing import Literal, Optional


@dataclass
class Support:
    uuid: str
    number: Optional[float] = None
    name: Optional[str] = None
    spanLength: Optional[float] = None
    spanAngle: Optional[float] = None
    attachmentSet: Optional[str] = None
    attachmentHeight: Optional[float] = None
    heightBelowConsole: Optional[float] = None
    cableType: Optional[str] = None
    armLength: Optional[float] = None
    chainName: Optional[str] = None
    towerModel: Optional[str] = None
    chainLength: Optional[float] = None
    chainWeight: Optional[float] = None
    chainV: Optional[bool] = None
    counterWeight: Optional[float] = None
    supportFootAltitude: Optional[float] = None
    attachmentPosition: Optional[str] = None
    chainSurface: Optional[float] = None


@dataclass
class InitialCondition:
    uuid: str
    name: str
    base_parameters: float
    base_temperature: float
    cable_pretension: float
    min_temperature: float
    max_wind_pressure: float
    max_frost_width: float


@dataclass
class Cable:
    id: str
    name: str
    data_source: str
    section: float
    diameter: float
    young_modulus: float
    linear_mass: float
    dilatation_coefficient: float
    temperature_reference: float
    stress_strain_a0: float
    stress_strain_a1: float
    stress_strain_a2: float
    stress_strain_a3: float
    stress_strain_a4: float
    stress_strain_b0: float
    stress_strain_b1: float
    stress_strain_b2: float
    stress_strain_b3: float
    stress_strain_b4: float
    is_polynomial: bool
    diameter_heart: float
    section_conductor: float
    section_heart: float
    solar_absorption: float
    emissivity: float
    electric_resistance_20: float
    linear_resistance_temperature_coef: float
    radial_thermal_conductivity: float
    has_magnetic_heart: bool
    is_bimetallic: bool | None = None
    rts_cable: float | None = None
    rts_layer_1: float | None = None
    nb_strand_layer_1: float | None = None
    rts_layer_2: float | None = None
    nb_strand_layer_2: float | None = None
    rts_layer_3: float | None = None
    nb_strand_layer_3: float | None = None
    rts_layer_4: float | None = None
    nb_strand_layer_4: float | None = None
    rts_layer_5: float | None = None
    nb_strand_layer_5: float | None = None
    rts_layer_6: float | None = None
    nb_strand_layer_6: float | None = None
    rts_layer_7: float | None = None
    nb_strand_layer_7: float | None = None
    rts_layer_8: float | None = None
    nb_strand_layer_8: float | None = None
    safety_coefficient: float | None = None


@dataclass
class GuyingInputs:
    horizontalDistance: float
    altitude: float
    hasPulley: bool
    selectedSpanIndex: int
    selectedSupport: Literal['LEFT', 'RIGHT']


@dataclass
class ParameterCalibrationInputs:
    parameterUncertaintyPapoto: float
    cableTemperatureCalibration: float
    cableTemperatureCalibrationUncertainty: float
    parameterPapoto: float
    span_index: int


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
    # datetime.datetime instead?
    date: datetime.datetime
    time: datetime.datetime
    windSpeed: float
    windSpeedUnit: Literal['kmh', 'ms']
    windDirection: str


@dataclass
class WindAngleCalculationInputs:
    azimuth: float
    windDirection: str


@dataclass
class ClimateCharge:
    windPressure: float
    cableTemperature: float
    symmetryType: str
    iceThickness: float
    frontierSupportNumber: int
    iceThicknessBefore: float
    iceThicknessAfter: float


@dataclass
class SpanLoad:
    loadPosition: float
    loadWeight: float


@dataclass
class ChangeStateInput:
    climate: ClimateCharge
    spanLoads: list[SpanLoad]


@dataclass
class Lambert93Data:
    lambert_x: list[float]  # easting
    lambert_y: list[float]  # northing

    # allow extra arguments
    @classmethod
    def from_dict(cls, env: dict):
        return cls(
            **{
                key: value
                for key, value in env.items()
                if key in inspect.signature(cls).parameters
            }
        )


@dataclass
class SectionGeoData:
    startLatitude: float
    startLongitude: float
    startAzimuth: float
    spanLength: list[float]
    lineAngle: list[float]

    # allow extra arguments
    @classmethod
    def from_dict(cls, env: dict):
        return cls(
            **{
                key: value
                for key, value in env.items()
                if key in inspect.signature(cls).parameters
            }
        )
