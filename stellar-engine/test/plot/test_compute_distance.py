import numpy as np
import pandas as pd
import pytest
from mechaphlowers import BalanceEngine, CableArray, SectionArray
from mechaphlowers.data.catalog.catalog import (
    sample_cable_catalog,
)


@pytest.fixture
def cable_array_AM600() -> CableArray:
    return sample_cable_catalog.get_as_object(["ASTER600"])


@pytest.fixture
def section_array_arm() -> SectionArray:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [30, 50, 60, 65],
                "crossarm_length": [0, 10, -10, 0],
                "line_angle": [0, 0, 0, 0],
                "insulator_length": [0, 3, 3, 0],
                "span_length": [500, 300, 400, np.nan],
                "insulator_mass": [1000, 500, 500, 1000],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        )
    )
    section_array.add_units({"line_angle": "grad"})
    section_array.sagging_parameter = 2000
    section_array.sagging_temperature = 15
    return section_array


@pytest.fixture
def balance_engine_simple(cable_array_AM600: CableArray) -> BalanceEngine:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3"],
                "suspension": [False, True, False],
                "conductor_attachment_altitude": [1900, 1950, 1960],
                "crossarm_length": [0, 0, 0],
                "line_angle": [0, 0, 0],
                "insulator_length": [3, 3, 3],
                "span_length": [500, 300, np.nan],
                "insulator_mass": [1000, 500, 500],
                "load_mass": [0, 0, 0],
                "load_position": [0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return BalanceEngine(
        cable_array=cable_array_AM600, section_array=section_array
    )


def _make_df(rows):
    """Build a DataFrame from a list of row dicts with the expected columns."""
    return pd.DataFrame(rows)


# def test_standard_case(balance_engine_simple):
#     df = [
#         {
#             'uuid': '4bbb2465-f175-47e9-b309-0cc2984eae0f',
#             'supportUuid': 'f5bc4a88-1ab9-4ca2-866b-079e1b831362',
#             'supportIndex': 0,
#             'name': 'mlm',
#             'type': 'accessible_building',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [{'x': 78, 'y': 15, 'z': 2300}],
#         },
#         {
#             'uuid': 'd2bb46e1-7efd-4e8c-9144-5a6b4e514162',
#             'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5',
#             'supportIndex': 0,
#             'name': '23_obs',
#             'type': 'agricultural_land',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'RIGHT',
#             'positions': [{'x': 78, 'y': 0, 'z': 2100}],
#         },
#         {
#             'uuid': '7dcf4ae2-efae-47e4-b6f0-9d18421f30e3',
#             'supportUuid': '91285b79-887d-4396-a0bd-9d6016c514e5',
#             'supportIndex': 1,
#             'name': '23_relative',
#             'type': 'agricultural_land',
#             'altitudeType': 'relative',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [{'x': 78, 'y': 100, 'z': 100}],
#         },
#         {
#             'uuid': '73538328-3ae4-4d40-8f56-eaa202ad3eec',
#             'supportUuid': 'f1f5d0a7-bd73-4786-b2c6-f76bc1c80c57',
#             'supportIndex': 0,
#             'name': '11111',
#             'type': 'accessible_building',
#             'altitudeType': 'relative',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'RIGHT',
#             'positions': [{'x': 50, 'y': 50, 'z': -264}],
#         },
#         {
#             'uuid': '71d46e2f-9f42-4633-893b-4d3b4b078d35',
#             'supportUuid': 'aebddf2d-21a1-4738-b584-22f4b4818df7',
#             'supportIndex': 0,
#             'name': 'aaaa',
#             'type': 'House',
#             'altitudeType': 'absolute',
#             'lateralDistanceType': 'SPAN_AXIS',
#             'referenceSupport': 'LEFT',
#             'positions': [{'x': 78, 'y': 100, 'z': 100}],
#         },
#     ]

#     engine = balance_engine_simple

#     plt = PlotEngine(engine=engine)

#     _ = add_obstacles(inputs=df, balance_engine=engine, plot_engine=plt)

#     compute_distances({}, plt)

# result = change_obstacles_coordinates(df, engine)

# np.testing.assert_array_almost_equal(
#      result["x"].to_numpy(), np.array([100.0, 100.0, 10.0, 200.0]
# ))
# np.testing.assert_array_almost_equal(
#      result["z"].to_numpy(), np.array([1955.0, 1900.0, 1950.0, 2050.0]
# ))
