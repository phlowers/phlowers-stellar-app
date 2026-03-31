# Copyright (c) 2026, RTE (http://www.rte-france.com)
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0

from mechaphlowers import PlotEngine
from mechaphlowers.plotting.utils import compute_aspect_ratio


def get_aspect_ratio(
    inputs: dict, plot_engine: PlotEngine
) -> dict[str, float]:
    x_scale = inputs["x"]
    y_scale = inputs["y"]
    z_scale = inputs["z"]
    span, supports, insulators = plot_engine.get_points_for_plot()
    print("Computing aspect ratio...................")
    print(f"python inputs: {inputs}")
    result = compute_aspect_ratio(
        span,
        supports,
        insulators,
        x_scale=x_scale,
        y_scale=y_scale,
        z_scale=z_scale,
    )
    print(result)
    return result
