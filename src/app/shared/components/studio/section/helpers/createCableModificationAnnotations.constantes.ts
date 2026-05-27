/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Color of the cable modification annotation (matches the loads palette). */
export const CABLE_MOD_COLOR = '#4A355A';

/**
 * FontAwesome glyph for the cable modification annotation.
 * `arrows-left-right-to-line` from FontAwesome Free 6+ Solid (unicode `e4ba`).
 */
export const CABLE_MOD_ICON = '&#xe4ba;';

/**
 * Horizontal pixel offset applied to the annotation's arrow tail (`ax`).
 *
 * @remarks
 * Kept at `0` so the icon stays vertically aligned with its anchor point on
 * the cable polyline. Vertical separation from the load icon is handled by
 * {@link CABLE_MOD_AY_OFFSET}.
 */
export const CABLE_MOD_AX_OFFSET = 0;

/**
 * Vertical pixel offset applied to the annotation's arrow tail (`ay`).
 *
 * @remarks
 * The load annotation uses `ay: -50`. Setting `ay = -90` places the cable
 * modification icon 40 px above the load icon, so the two never overlap when
 * a load happens to sit at the same span location.
 */
export const CABLE_MOD_AY_OFFSET = -90;
