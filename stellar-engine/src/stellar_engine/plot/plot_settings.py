# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from mechaphlowers import SectionStudy

logger = logging.getLogger(__name__)


def get_aspect_ratio(
    inputs: dict, study: SectionStudy, start_support: int, end_support: int
) -> dict[str, float]:
    logger.debug(
        f"Calculating aspect ratio with inputs: {inputs}, start_support: {start_support}, end_support: {end_support}"
    )
    x_scale = inputs["x"]
    y_scale = inputs["y"]
    z_scale = inputs["z"]
    # span, supports, insulators = study.position_engine.get_group_points().get_points_for_plot()
    # obstacles = study.position_engine.obstacles_dict()
    # logger.debug(f"Obstacles: {obstacles}")

    try:
        result = study.position_engine.get_group_points().get_aspect_ratio(
            x_scale=x_scale,
            y_scale=y_scale,
            z_scale=z_scale,
        )
        logger.debug(f"Aspect ratio result: {result}")
    except Exception as e:
        logger.error(f"Error computing aspect ratio: {e}")

    return result
