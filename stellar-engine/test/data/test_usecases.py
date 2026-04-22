# module for data related to use cases, such as example inputs and outputs for testing purposes.


import numpy as np
import pandas as pd
import pytest
from mechaphlowers import BalanceEngine, CableArray, PlotEngine, SectionArray
from mechaphlowers.data.catalog.catalog import (
    sample_cable_catalog,
)
from mechaphlowers.data.units import convert_weight_to_mass


@pytest.fixture
def example_obstacle_inputs():
    return [
        {
            'uuid': '30edf0ca-c4f6-4e65-b11a-1539db61ecaa',
            'supportUuid': 'aebddf2d-21a1-4738-b584-22f4b4818df7',
            'supportIndex': 0,
            'name': 'tyty',
            'type': 'agricultural_land',
            'altitudeType': 'absolute',
            'lateralDistanceType': 'SPAN_AXIS',
            'referenceSupport': 'LEFT',
            'positions': [{'x': 100, 'y': 15, 'z': 1955}],
        },
        {
            'uuid': '4bbb2465-f175-47e9-b309-0cc2984eae0f',
            'supportUuid': 'f5bc4a88-1ab9-4ca2-866b-079e1b831362',
            'supportIndex': 3,
            'name': 'mlm',
            'type': 'accessible_building',
            'altitudeType': 'absolute',
            'lateralDistanceType': 'SPAN_AXIS',
            'referenceSupport': 'LEFT',
            'positions': [{'x': 100, 'y': 15, 'z': 2300}],
        },
    ]


@pytest.fixture
def default_section_array_three_spans() -> SectionArray:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": np.array(["support 1", "2", "three", "support 4"]),
                "suspension": np.array([False, True, True, False]),
                "conductor_attachment_altitude": np.array([2.2, 5, -0.12, 0]),
                "crossarm_length": np.array([10, 12.1, 10, 10.1]),
                "line_angle": np.array([0, 360, 90.1, -90.2]),
                "insulator_length": np.array([0, 4, 3.2, 0]),
                "span_length": np.array([400, 500.2, 500.0, np.nan]),
                "insulator_mass": np.array([1000.0, 500.0, 500.0, 1000.0]),
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "deg"})
    return section_array


@pytest.fixture
def cable_array_AM600() -> CableArray:
    return sample_cable_catalog.get_as_object(["ASTER600"])


@pytest.fixture
def balance_engine_base_test(cable_array_AM600: CableArray) -> BalanceEngine:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [50, 100, 50, 50],
                "crossarm_length": [10, 10, 10, 10],
                "line_angle": [0, 0, 0, 0],
                "insulator_length": [3, 3, 3, 3],
                "span_length": [500, 500, 500, np.nan],
                "insulator_mass": convert_weight_to_mass(
                    [1000.0, 500.0, 500.0, 1000.0]
                ),
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    be = BalanceEngine(
        cable_array=cable_array_AM600, section_array=section_array
    )

    be.solve_adjustment()
    return be


@pytest.fixture
def plot_engine_base_test(
    balance_engine_base_test: BalanceEngine,
) -> PlotEngine:
    return PlotEngine(engine=balance_engine_base_test)


# def test_obstacle_addition(
#     example_obstacle_inputs,
#     balance_engine_base_test: BalanceEngine,
#     plot_engine_base_test: PlotEngine,
# ):
#     result = obstacles.add_obstacles(
#         example_obstacle_inputs,
#         balance_engine_base_test,
#         plot_engine_base_test,
#     )

#     assert 'obstacles' in result
#     assert len(result['obstacles']) == len(example_obstacle_inputs)
#     for obs in result['obstacles']:
#         assert 'uuid' in obs
#         assert 'points' in obs
#         assert len(obs['points']) > 0
