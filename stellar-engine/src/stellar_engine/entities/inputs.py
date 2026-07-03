# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import datetime
import inspect
import logging
from dataclasses import dataclass
from typing import Literal, Optional

import numpy as np
from mechaphlowers import units

logger = logging.getLogger("stellar_engine")


def compute_ice_thickness(climate, section_length):
    ice_thickness: float | np.ndarray
    if climate.symmetryType == "dis_symmetric":
        support_frontier = (
            climate.frontierSupportNumber - 1
        )  # indexation in js starts at 1
        ice_before = climate.iceThicknessBefore
        ice_after = climate.iceThicknessAfter
        ice_thickness = np.empty(section_length)
        ice_thickness[:support_frontier] = ice_before
        ice_thickness[support_frontier:-1] = ice_after
        ice_thickness[-1] = np.nan
    elif climate.symmetryType == "symmetric":
        ice_thickness = climate.iceThickness
    else:
        raise ValueError(
            f"Unsupported symmetryType: {climate.symmetryType}. Expected 'dis_symmetric' or 'symmetric'"
        )
    ice_thickness = units(ice_thickness, "cm").to("m").magnitude

    return ice_thickness


SUPPORT_REFERENCE_MAPPING: dict[str, Literal["left", "right"]] = {
    "LEFT": "left",
    "RIGHT": "right",
}

LATERAL_DISTANCE_MAPPING: dict[str, Literal["span_axis", "line_axis"]] = {
    "SPAN_AXIS": "span_axis",
    "LINE_AXIS": "line_axis",
}

ALTITUDE_TYPE_MAPPING: dict[
    str, Literal["absolute", "support_relative", "attachment_relative"]
] = {
    "absolute": "absolute",
    "relative": "support_relative",
    "relative_cable": "attachment_relative",
}


def get_single_coords_from_studio_tab(
    altitude_type: str,
    lateral_distance_type: str,
    coords: np.ndarray,
    ground_altitude: float,
    attachment_altitude: float,
) -> np.ndarray:
    logger.debug(
        f"Calculating coordinates for single obstacle with altitude_type: {altitude_type}, lateral_distance_type: {lateral_distance_type}, positions: {coords}"
    )
    logger.debug(
        "No lateral distance adjustment is applied for single obstacles in this implementation."
    )

    if altitude_type == "attachment_relative":
        # Assuming attachment_altitude is available in the context
        coords[:, 2] += attachment_altitude

    elif altitude_type == "support_relative":
        # Assuming ground_altitude is available in the context
        coords[:, 2] += ground_altitude
    elif altitude_type == "absolute":
        # No adjustment needed for absolute altitude
        pass
    else:
        logger.warning(
            f"Altitude type '{altitude_type}' is not recognized. Using absolute altitude."
        )

    logger.debug(f"Calculated coordinates for single obstacle: {coords}")
    return coords


def get_points_from_context(
    inputs, study, support_index, key_object="points"
) -> tuple[dict, np.ndarray]:
    """Extracts a single point or obstacle from the inputs and computes its coordinates based on the study context.

    Expected field in inputs: 'points' or 'obstacles' (depending on key_object), which should contain a list with a single dictionary representing the point or obstacle.
    Inside the dictionary, are expected:
    - 'positions' should be a list of dictionaries with 'x', 'y', and 'z' keys representing coordinates.
    - 'referenceSupport' should be either 'LEFT' or 'RIGHT'.
    - 'altitudeType' should be one of 'absolute', 'relative', or 'relative_cable'.
    - 'lateralDistanceType' should be either 'SPAN_AXIS' or 'LINE_AXIS'.


    """

    if len(inputs[key_object]) != 1:
        logger.error(
            f"Expected a single {key_object}, but received {len(inputs[key_object])}."
        )
        raise ValueError(
            f"Expected a single {key_object}, but received {len(inputs[key_object])}."
        )

    my_object = inputs[key_object][0]
    logger.debug(f"Received single {key_object}: {my_object}")
    logger.debug(
        f"Adding single {key_object} with support index: {support_index}"
    )
    logger.debug(f"{key_object} coordinates: {my_object['positions']}")
    logger.debug("Overwrite is set to True for adding the obstacle.")
    logger.debug(
        "attachment_altitude is taken from the section's conductor attachment altitude, not moving with state changes."
    )
    logger.debug(
        "and ground_altitude is taken from the section's ground altitude."
    )

    coords = np.array(
        [[pos['x'], pos['y'], pos['z']] for pos in my_object['positions']],
        dtype=np.float64,
    )

    altitude_index = support_index
    if my_object['referenceSupport'] == 'RIGHT':
        altitude_index = support_index + 1

    my_object['engineReferenceSupport'] = SUPPORT_REFERENCE_MAPPING[
        my_object['referenceSupport']
    ]

    coords = get_single_coords_from_studio_tab(
        altitude_type=ALTITUDE_TYPE_MAPPING[my_object['altitudeType']],
        lateral_distance_type=LATERAL_DISTANCE_MAPPING[
            my_object['lateralDistanceType']
        ],
        coords=coords,
        ground_altitude=float(
            study.balance_engine.section_array.data.ground_altitude.to_numpy()[
                altitude_index
            ]
        ),
        attachment_altitude=float(
            study.balance_engine.section_array.data.conductor_attachment_altitude.to_numpy()[
                altitude_index
            ]
        ),
    )

    return my_object, coords


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
    base_parameters: float | None
    base_temperature: float | None
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
    skyCover: Literal[
        "N0",
        "N1",
        "N2",
        "N3",
        "N4",
        "N5",
        "N6",
        "N7",
        "N8",
    ]
    altitude: float
    azimuth: float
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
                if key in cls.__dataclass_fields__
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


@dataclass
class PoseTableInputs:
    stepTemperature: float
    baseTemperature: float
    numberValues: int
