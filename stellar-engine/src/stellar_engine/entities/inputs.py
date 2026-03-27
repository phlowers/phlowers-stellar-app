# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import datetime
from dataclasses import dataclass
from typing import Literal


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
    date: datetime
    time: datetime
    windSpeed: float
    windSpeedUnit: Literal['kmh', 'ms']
    windDirection: str
