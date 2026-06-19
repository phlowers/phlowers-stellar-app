/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ANNOTATION_COLOR } from './studio-annotations.tokens';

export { ANNOTATION_COLOR as CABLE_MOD_COLOR };

/**
 * FontAwesome glyph for the cable modification annotation.
 * `arrows-left-right-to-line` from FontAwesome Free 6+ Solid (unicode `e4ba`).
 */
export const CABLE_MOD_ICON = '&#xe4ba;';

/**
 * Horizontal pixel offset applied to the annotation's arrow tail (`ax`).
 *
 * @remarks
 * Kept at `0` (same as the load annotation) so the icon stays vertically
 * aligned with its anchor point on the cable polyline.
 */
export const CABLE_MOD_ARROW_X_OFFSET = 0;

/**
 * Vertical pixel offset applied to the annotation's arrow tail (`ay`).
 *
 * @remarks
 * The load annotation uses `ay: -50` (icon 50 px above the anchor on the
 * cable). Setting `ay = -90` places the cable modification icon 40 px above
 * the load icon, so the two never overlap when both annotations anchor on
 * the same data point. The arrow line connecting the icon to the cable is
 * drawn by Plotly exactly like for the load annotation, giving a coherent
 * visual style.
 */
export const CABLE_MOD_ARROW_Y_OFFSET = -90;

/**
 * Vertical pixel offset applied to the modification label
 * ("Raccourcissement" / "Allongement"), shown just above the icon.
 *
 * @remarks
 * Positive `yshift` moves the annotation upward in screen space, so
 * `110 px` keeps a `~20 px` gap with the icon (which sits at `|ay|=90 px`
 * above the anchor) regardless of zoom.
 */
export const CABLE_MOD_LABEL_Y_SHIFT = 110;

/**
 * Returns the user-facing label for a cable length modification direction.
 *
 * @remarks
 * Wrapped in a function so `$localize` is evaluated at call time, which
 * keeps the constants module side-effect free and friendly to unit tests.
 */
export const getCableModificationLabel = (widthCable: 'lengthening' | 'shortening'): string =>
  widthCable === 'lengthening'
    ? $localize`:@@studio.cable-modification.lengthening:Lengthening`
    : $localize`:@@studio.cable-modification.shortening:Shortening`;
