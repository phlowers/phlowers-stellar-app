import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from mechaphlowers import (
    BalanceEngine,
    CableArray,
    SectionArray,
    sample_cable_catalog,
)

projet_dir: Path = Path(__file__).resolve().parents[1]
print("--conftest--")
print(projet_dir)
source_dir: Path = projet_dir / "src"
sys.path.append(str(source_dir))


@pytest.fixture
def cable_array_AM600() -> CableArray:
    return sample_cable_catalog.get_as_object(["ASTER600"])


@pytest.fixture
def balance_engine_base(cable_array_AM600: CableArray) -> BalanceEngine:
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
                "insulator_mass": [100.0, 50.0, 5.0, 100.0],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return BalanceEngine(
        cable_array=cable_array_AM600, section_array=section_array
    )


@pytest.fixture
def balance_engine_no_anchor(cable_array_AM600: CableArray) -> BalanceEngine:
    section_array = SectionArray(
        pd.DataFrame(
            {
                "name": ["1", "2", "3", "4"],
                "suspension": [False, True, True, False],
                "conductor_attachment_altitude": [30, 50, 60, 65],
                "crossarm_length": [0, 10, 10, 0],
                "line_angle": [0, 0, 0, 0],
                "insulator_length": [0.01, 3, 3, 0.01],
                "span_length": [500, 300, 400, np.nan],
                "insulator_mass": [100.0, 50.0, 50.0, 100.0],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})
    return BalanceEngine(
        cable_array=cable_array_AM600, section_array=section_array
    )

@pytest.fixture
def study_base(cable_array_AM600: CableArray):
    from stellar_engine.plot.obstacles import SectionStudy

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
                "insulator_mass": [100.0, 50.0, 5.0, 100.0],
                "load_mass": [0, 0, 0, 0],
                "load_position": [0, 0, 0, 0],
            }
        ),
        sagging_parameter=2000,
        sagging_temperature=15,
    )
    section_array.add_units({"line_angle": "grad"})

    return SectionStudy(cable_array=cable_array_AM600, section_array=section_array)