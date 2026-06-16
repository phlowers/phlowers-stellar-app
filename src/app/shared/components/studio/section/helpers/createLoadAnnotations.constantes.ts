/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ANNOTATION_COLOR } from './studio-annotations.tokens';

export { ANNOTATION_COLOR as LOAD_COLOR };

/**
 * FontAwesome glyph for a punctual span load annotation.
 * `location-dot` from FontAwesome Free 6+ Solid (unicode `f5cd`).
 */
export const LOAD_ICON = '&#xf5cd;';

/**
 * FontAwesome glyph for a marking span load annotation.
 * `thumbtack` from FontAwesome Free 6+ Solid (unicode `f08d`).
 */
export const MARKING_ICON = '&#xf08d;';

/**
 * Vertical pixel offset applied to the load annotation icon above its anchor (`ay`).
 * Negative value moves the icon upward (50 px above the anchor point on the cable).
 */
export const LOAD_ARROW_Y_OFFSET = -50;
