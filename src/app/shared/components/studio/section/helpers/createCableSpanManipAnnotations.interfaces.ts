/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data payload attached to a Plotly cable span manipulation icon for click event handling.
 *
 * @remarks
 * Discriminated by `type === 'cableSpanManip'`. Used by the click handler in `SectionPlotComponent` to open the Loads
 * side panel on the "Cable span manipulation" tab and pre-select the corresponding span.
 *
 * @category Studio
 */
export interface CableSpanManipAnnotationData {
  /** Discriminator indicating this annotation represents a cable span manipulation. */
  type: 'cableSpanManip';
  /** UUID of the manipulated span (its left support UUID). */
  spanUuid: string;
}
