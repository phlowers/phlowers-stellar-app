/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { View } from '@shared/types/plot.types';

/**
 * Look of an icon standing `offsetY` px above its anchor point, joined to it by a dashed line.
 *
 * @remarks
 * Matches the `PlotlyDrawings` entries drawn that way (cut strands, cable span manipulation), which are passed as is.
 *
 * @category Studio
 */
export interface DashedIconLineStyle {
  /** Height of the icon box center above the anchor point, in pixels. */
  offsetY: number;
  /** Font size of the icon glyph, per view. */
  iconSize: Readonly<Record<View, number>>;
  /** Padding between the glyph and the icon border, per view. */
  borderPad: Readonly<Record<View, number>>;
  /** Width of the dashed line, per view. */
  lineWidth: Readonly<Record<View, number>>;
  /** Length of a dash, in pixels. */
  dashLength: number;
  /** Gap between two dashes, in pixels. */
  dashGap: number;
  /** Color of the icon and its dashed line. */
  unselected: { readonly color: string };
}
