/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { TranslocoService } from '@jsverse/transloco';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { View } from '@shared/types/plot.types';

// Plotly's default annotation border width, which the icon keeps
const ICON_BORDER_WIDTH = 1;

/**
 * Length of the dashed line, from the anchor point up to the bottom edge of the icon box (pixels, whatever the zoom).
 *
 * @remarks
 * The icon box is centered `offsetY` px above the anchor. Its half height is half the glyph, its padding and its
 * border, taken up to the next whole pixel: Plotly sizes the glyph box from the font metrics, up to 1 px taller than
 * the icon size (13 px for a 12 px icon).
 */
export const getCutStrandsLineLength = (view: View): number => {
  const { offsetY, iconSize, borderPad } = PlotlyDrawings.cutStrands;
  const iconHalfHeight = Math.floor(iconSize[view] / 2 + borderPad[view] + ICON_BORDER_WIDTH) + 1;
  return offsetY - iconHalfHeight;
};

/**
 * Returns the hover label of the cut strands marking.
 *
 * @remarks
 * Wrapped in a function so translation is evaluated at call time. Without a
 * `translocoService` (e.g. in unit tests), falls back to the English string.
 */
export const getCutStrandsLabel = (translocoService?: TranslocoService): string =>
  translocoService ? translocoService.translate('shared.studio.cut-strands-marking') : 'Cut strands';
