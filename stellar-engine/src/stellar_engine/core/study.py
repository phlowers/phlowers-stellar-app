# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from copy import deepcopy
import logging

from mechaphlowers import BalanceEngine, CableArray, PlotEngine, SectionArray, SectionStudy, units
from mechaphlowers.entities.arrays import ObstacleArray
import numpy as np
import pandas as pd
from stellar_engine.core.section import generate_section_array
from stellar_engine.entities import output
from stellar_engine.entities.inputs import Cable, ClimateCharge, InitialCondition, Support

from stellar_engine.entities.errors import _Errors

from dataclasses import fields as dataclass_fields

from stellar_engine.plot.run_solver import apply_span_loads


logger = logging.getLogger(__name__)

def extract_initial_condition(input_section: dict) -> InitialCondition:
    input_initial_conditions: list = input_section["initial_conditions"]
    input_initial_condition = (
        None
        if len(input_initial_conditions) == 0
        else next(
            condition
            for condition in input_initial_conditions
            if condition["uuid"] == input_section["selected_initial_condition_uuid"]
        )
    )
    if input_initial_condition is None:
        return InitialCondition(
            uuid="",
            name="",
            base_parameters=None,
            base_temperature=None,
            cable_pretension=0,
            min_temperature=0,
            max_wind_pressure=0,
            max_frost_width=0,
        )
    return InitialCondition(**input_initial_condition)


def extract_selected_charge(input_section: dict) -> dict | None:
    input_charges = input_section["charges"] if "charges" in input_section else []
    return (
        None
        if not input_charges
        else next(
            (
                charge
                for charge in input_charges
                if charge["uuid"] == input_section["selected_charge_uuid"]
            ),
            None,
        )
    )


def build_supports_dataframe(input_section: dict) -> pd.DataFrame:
    if not input_section["supports"]:
        raise ValueError(_Errors.NO_SUPPORTS)
    # Filter out keys unknown to the Support dataclass (e.g. fields added in the
    # TypeScript model that have no Python counterpart, such as spanAzimut or
    # xFootLambert93).
    support_fields = {f.name for f in dataclass_fields(Support)}
    supports_data = []
    for support_js in input_section["supports"]:
        filtered = {k: v for k, v in support_js.items() if k in support_fields}
        supports_data.append(Support(**filtered))
    return generate_section_array(supports_data)


def build_cable_array(cable: Cable) -> CableArray:
    cable_array = CableArray(
        pd.DataFrame(
            {
                "section": [cable.section],
                "diameter": [cable.diameter],
                "linear_mass": [cable.linear_mass],
                "young_modulus": [cable.young_modulus],
                "dilatation_coefficient": [cable.dilatation_coefficient],
                "temperature_reference": [cable.temperature_reference],
                "a0": [cable.stress_strain_a0],
                "a1": [cable.stress_strain_a1],
                "a2": [cable.stress_strain_a2],
                "a3": [cable.stress_strain_a3],
                "a4": [cable.stress_strain_a4],
                "b0": [cable.stress_strain_b0],
                "b1": [cable.stress_strain_b1],
                "b2": [cable.stress_strain_b2],
                "b3": [cable.stress_strain_b3],
                "b4": [cable.stress_strain_b4],
                "diameter_heart": [cable.diameter_heart],
                "section_conductor": [cable.section_conductor],
                "section_heart": [cable.section_heart],
                "solar_absorption": [cable.solar_absorption],
                "emissivity": [cable.emissivity],
                "electric_resistance_20": [cable.electric_resistance_20],
                "linear_resistance_temperature_coef": [
                    cable.linear_resistance_temperature_coef
                ],
                "radial_thermal_conductivity": [cable.radial_thermal_conductivity],
                "has_magnetic_heart": [cable.has_magnetic_heart],
                "is_polynomial": [cable.is_polynomial],
                "rts_cable": [cable.rts_cable],
                "rts_layer_1": [cable.rts_layer_1],
                "nb_strand_layer_1": [cable.nb_strand_layer_1],
                "rts_layer_2": [cable.rts_layer_2],
                "nb_strand_layer_2": [cable.nb_strand_layer_2],
                "rts_layer_3": [cable.rts_layer_3],
                "nb_strand_layer_3": [cable.nb_strand_layer_3],
                "rts_layer_4": [cable.rts_layer_4],
                "nb_strand_layer_4": [cable.nb_strand_layer_4],
                "rts_layer_5": [cable.rts_layer_5],
                "nb_strand_layer_5": [cable.nb_strand_layer_5],
                "rts_layer_6": [cable.rts_layer_6],
                "nb_strand_layer_6": [cable.nb_strand_layer_6],
                "rts_layer_7": [cable.rts_layer_7],
                "nb_strand_layer_7": [cable.nb_strand_layer_7],
                "rts_layer_8": [cable.rts_layer_8],
                "nb_strand_layer_8": [cable.nb_strand_layer_8],
                "safety_coefficient": [cable.safety_coefficient],
            }
        )
    )
    cable_array.add_units(
        {
            "young_modulus": "MPa",
            "dilatation_coefficient": "1/K",
        }
    )
    return cable_array


def apply_climate_to_engine(
    study: SectionStudy, climate: dict, section_length: int
) -> None:
    climate_data = ClimateCharge(**climate)

    ice_thickness: float | np.ndarray
    if climate_data.symmetryType == "dis_symmetric":
        support_frontier = (
            climate_data.frontierSupportNumber - 1
        )  # indexation in js starts at 1
        ice_before = climate_data.iceThicknessBefore
        ice_after = climate_data.iceThicknessAfter
        ice_thickness = np.empty(section_length)
        ice_thickness[:support_frontier] = ice_before
        ice_thickness[support_frontier:-1] = ice_after
        ice_thickness[-1] = np.nan
    elif climate_data.symmetryType == "symmetric":
        ice_thickness = climate_data.iceThickness
    else:
        raise ValueError(
            _Errors.unsupported_symmetry_type(climate_data.symmetryType)
        )
    ice_thickness = (
        units(ice_thickness, "cm").to("m").magnitude
    )  # in meters in the engine

    study.balance_engine.solve_change_state(
        ice_thickness=ice_thickness,
        new_temperature=climate_data.cableTemperature,
        wind_pressure=climate_data.windPressure,
        wind_direction="clockwise",
    )


def initialize_study(python_inputs: dict):
    logger.debug(f"Initializing section with inputs: {python_inputs}")

    input_section = python_inputs["section"]
    initial_condition = extract_initial_condition(input_section)
    input_charge = extract_selected_charge(input_section)
    df = build_supports_dataframe(input_section)
    cable_array = build_cable_array(Cable(**python_inputs["cable"]))

    section = SectionArray(
        df,
        sagging_parameter=initial_condition.base_parameters,
        sagging_temperature=initial_condition.base_temperature,
        bundle_number=input_section["cables_amount"],
    )
    section.angle_direction = "clockwise"


    study = SectionStudy(
        cable_array=cable_array,
        section_array=section,
    )
    # engine = BalanceEngine(cable_array=cable_array, section_array=section)
    # plt_line = PlotEngine(engine)
    study.solve_adjustment()
    study.solve_change_state()

    # study.position_engine.add_obstacle_array(
    #     obstacle_array=ObstacleArray(
    #         pd.DataFrame(
    #             {
    #                 "name": [],
    #                 "point_index": [],
    #                 "span_index": [],
    #                 "x": [],
    #                 "y": [],
    #                 "z": [],
    #                 "object_type": [],
    #             }
    #         )
    #     )
    # )

    # Create base engine state (before any climate changes)
    # TODO: replace this by section.copy() later
    # base_section = SectionArray(
    #     df.copy(),
    #     sagging_parameter=initial_condition.base_parameters,
    #     sagging_temperature=initial_condition.base_temperature,
    #     bundle_number=input_section["cables_amount"],
    # )
    # base_section.angle_direction = "clockwise"
    # base_study = SectionStudy(
    #     cable_array=cable_array,
    #     section_array=base_section,
    #     initial_condition=initial_condition,
    #     charge=input_charge,
    # )
    # base_study.solve_adjustment()
    # base_study.solve_change_state()
    base_study = deepcopy(study)

    climate = None
    if input_charge and "data" in input_charge and "climate" in input_charge["data"]:
        climate = input_charge["data"]["climate"]

    has_span_loads = (
        input_charge
        and "data" in input_charge
        and "spanLoads" in input_charge["data"]
        and len(input_charge["data"]["spanLoads"]) > 0
    )

    if has_span_loads:
        apply_span_loads(study, input_charge["data"]["spanLoads"])
        study.solve_adjustment()

    if climate:
        apply_climate_to_engine(study, climate, len(study.balance_engine))
    elif has_span_loads:
        study.balance_engine.solve_change_state()

    section_length = len(study.balance_engine)
    base_section_length = len(base_study.balance_engine)
    print(f"Study initialized. Study: {study}, Base Study: {base_study}")

    return study, base_study
