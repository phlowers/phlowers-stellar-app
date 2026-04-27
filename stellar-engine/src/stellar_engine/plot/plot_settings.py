# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

import logging

from mechaphlowers import PlotEngine
from mechaphlowers.core.geometry.points import Points
from mechaphlowers.plotting.utils import compute_aspect_ratio

logger = logging.getLogger(__name__)


def get_aspect_ratio(
    inputs: dict, plot_engine: PlotEngine, start_support: int, end_support: int
) -> dict[str, float]:
    logger.debug(
        f"Calculating aspect ratio with inputs: {inputs}, start_support: {start_support}, end_support: {end_support}"
    )
    x_scale = inputs["x"]
    y_scale = inputs["y"]
    z_scale = inputs["z"]
    span, supports, insulators = plot_engine.get_points_for_plot()
    obstacles = plot_engine.position_engine.obstacles_dict()
    logger.debug(f"Obstacles: {obstacles}")

    try:
        result = compute_aspect_ratio(
            Points(span.coords[start_support:end_support]),
            Points(supports.coords[start_support:end_support]),
            Points(insulators.coords[start_support:end_support]),
            x_scale=x_scale,
            y_scale=y_scale,
            z_scale=z_scale,
        )
        logger.debug(f"Aspect ratio result: {result}")
    except Exception as e:
        logger.error(f"Error computing aspect ratio: {e}")

    return result
