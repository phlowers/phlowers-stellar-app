/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TranslocoService } from '@jsverse/transloco';

// primary-600 of the app palette
export const CUT_STRANDS_COLOR = '#7D5A9F';

/**
 * FontAwesome glyph for the cut strands marking.
 * `scissors` from FontAwesome Free 6+ Solid (unicode `f0c4`).
 */
export const CUT_STRANDS_ICON = '&#xf0c4;';

export const CUT_STRANDS_ICON_SIZE = 12;
export const CUT_STRANDS_ICON_PADDING = 6;

/**
 * Vertical pixel distance between the anchor point and the centre of the icon.
 *
 * @remarks
 * Always in pixels, never in data units: the marking keeps the same gap at any zoom level.
 */
export const CUT_STRANDS_OFFSET_Y = 90;

// Half height of the icon box (glyph, padding and border), so the dashed line stops at the box edge
const CUT_STRANDS_ICON_HALF_HEIGHT = 14;

// Length of the dashed line, from the anchor point up to the bottom of the icon
export const CUT_STRANDS_LINE_LENGTH = CUT_STRANDS_OFFSET_Y - CUT_STRANDS_ICON_HALF_HEIGHT;

export const CUT_STRANDS_DASH_LENGTH = 6;
export const CUT_STRANDS_DASH_GAP = 4;

// Text color of the hover label, over a CUT_STRANDS_COLOR background
export const CUT_STRANDS_HOVER_TEXT_COLOR = '#ffffff';

/**
 * Returns the hover label of the cut strands marking.
 *
 * @remarks
 * Wrapped in a function so translation is evaluated at call time. Without a
 * `translocoService` (e.g. in unit tests), falls back to the English string.
 */
export const getCutStrandsLabel = (translocoService?: TranslocoService): string =>
  translocoService ? translocoService.translate('shared.studio.cut-strands-marking') : 'Cut strands';
