# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import re

import numpy as np
import pytest
from mechaphlowers import BalanceEngine, SectionStudy

from stellar_engine.core import cut_strands
from stellar_engine.entities.errors import _Errors


def test_set_cut_strands_updates_array(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    cut_strands_input = [1, 0, 0, 0, 0, 0, 0, 0]

    result = cut_strands.set_cut_strands(study, cut_strands_input)

    assert result == {"success": True}
    np.testing.assert_array_equal(
        study.balance_engine.cable_array.cut_strands,
        np.array(cut_strands_input),
    )
    assert np.issubdtype(
        study.balance_engine.cable_array.cut_strands.dtype, np.integer
    )


def test_set_cut_strands_accepts_integer_floats(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    result = cut_strands.set_cut_strands(
        study, [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    )

    assert result == {"success": True}
    np.testing.assert_array_equal(
        study.balance_engine.cable_array.cut_strands,
        np.array([1, 0, 0, 0, 0, 0, 0, 0]),
    )
    assert np.issubdtype(
        study.balance_engine.cable_array.cut_strands.dtype, np.integer
    )


def test_set_cut_strands_rejects_nan(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    with pytest.raises(ValueError, match="must be finite"):
        cut_strands.set_cut_strands(study, [float("nan"), 0, 0, 0, 0, 0, 0, 0])


def test_set_cut_strands_rejects_infinity(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    with pytest.raises(ValueError, match="must be finite"):
        cut_strands.set_cut_strands(study, [float("inf"), 0, 0, 0, 0, 0, 0, 0])


def test_set_cut_strands_rejects_non_integer(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    with pytest.raises(ValueError, match="must be an integer"):
        cut_strands.set_cut_strands(study, [1.5, 0, 0, 0, 0, 0, 0, 0])


def test_set_cut_strands_layer_count_mismatch(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    with pytest.raises(ValueError, match="Cut strands input has 3 layers"):
        cut_strands.set_cut_strands(study, [1, 0, 0])


def test_set_cut_strands_negative_value(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    with pytest.raises(ValueError, match="cannot be negative"):
        cut_strands.set_cut_strands(study, [-1, 0, 0, 0, 0, 0, 0, 0])


def test_set_cut_strands_exceeds_layer_total(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    nb_strands = study.balance_engine.cable_array.nb_strand_per_layer

    with pytest.raises(
        ValueError,
        match=re.escape(
            _Errors.cut_strands_exceeds_layer(
                0, nb_strands[0] + 1, nb_strands[0]
            )
        ),
    ):
        cut_strands.set_cut_strands(
            study, [nb_strands[0] + 1, 0, 0, 0, 0, 0, 0, 0]
        )


def test_get_cut_strands_returns_default(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    result = cut_strands.get_cut_strands(study)

    assert result == {"cutStrands": [0, 0, 0, 0, 0, 0, 0, 0]}


def test_get_cut_strands_returns_set_value(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    cut_strands.set_cut_strands(study, [2, 1, 0, 0, 0, 0, 0, 0])

    result = cut_strands.get_cut_strands(study)

    assert result == {"cutStrands": [2, 1, 0, 0, 0, 0, 0, 0]}


def test_get_rrts_returns_positive_value(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    result = cut_strands.get_rrts(study)

    assert "rrts" in result
    assert result["rrts"] > 0


def test_get_utilization_rate_returns_array(
    balance_engine_base: BalanceEngine,
):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )
    study.solve_adjustment()
    study.solve_change_state()

    result = cut_strands.get_utilization_rate(study)

    assert "utilizationRate" in result
    assert len(result["utilizationRate"]) == len(study.balance_engine)
    utilization_rate = np.array(result["utilizationRate"])
    assert np.all(utilization_rate[~np.isnan(utilization_rate)] >= 0)


def test_set_high_safety_updates_flag(balance_engine_base: BalanceEngine):
    study = SectionStudy(
        cable_array=balance_engine_base.cable_array,
        section_array=balance_engine_base.section_array,
    )

    result = cut_strands.set_high_safety(study, True)

    assert result == {"success": True}
    assert study.balance_engine.cable_array.high_safety is True
