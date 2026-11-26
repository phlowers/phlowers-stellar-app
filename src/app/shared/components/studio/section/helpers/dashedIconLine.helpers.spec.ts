/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { describe, it, expect } from 'vitest';
import { PlotlyDrawings } from '@shared/constants/plotly-drawings.constantes';
import { getDashedIconLineLength } from './dashedIconLine.helpers';

describe('getDashedIconLineLength', () => {
  // The icon box is centered offsetY px above the anchor; it wraps the glyph (about iconSize tall), its padding and
  // its 1 px border
  it.each([
    ['cut strands', '2d'],
    ['cut strands', '3d'],
    ['cable span manipulation', '2d'],
    ['cable span manipulation', '3d']
  ] as const)('should stop the %s %s line at most 1 px below the icon box', (drawing, view) => {
    const style = drawing === 'cut strands' ? PlotlyDrawings.cutStrands : PlotlyDrawings.cableSpanManip;
    const { offsetY, iconSize, borderPad } = style;
    const boxBottom = offsetY - (iconSize[view] / 2 + borderPad[view] + 1);

    expect(getDashedIconLineLength(style, view)).toBeLessThan(boxBottom);
    expect(getDashedIconLineLength(style, view)).toBeGreaterThanOrEqual(boxBottom - 1);
  });
});
