# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0


# TODO: investigate to see if logging is imported correctly
import logging

from mechaphlowers import SectionStudy

from stellar_engine.entities.inputs import ClimateCharge, compute_ice_thickness

logger = logging.getLogger("stellar_engine")


def change_state(
    change_state_inputs: dict,
    study: SectionStudy,
    reload: bool = False,
) -> dict:
    climate = ClimateCharge(**change_state_inputs["climate"])
    logger.debug("python_inputs: %s", change_state_inputs)
    wind_pressure = climate.windPressure
    cable_temperature = climate.cableTemperature
    ice_thickness = compute_ice_thickness(climate, len(study.balance_engine))

    # apply_span_loads(study, change_state_inputs["spanLoads"])
    logger.debug("---------Load case applied to engine---------")
    logger.debug(
        "Wind pressure: %s, Cable temperature: %s, Ice thickness: %s",
        wind_pressure,
        cable_temperature,
        ice_thickness,
    )
    logger.debug("-----------------------------------------------")

    if reload:
        study.solve_adjustment()

    study.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=cable_temperature,
        wind_pressure=wind_pressure,
        wind_direction="clockwise",
    )

    return {"success": True}
