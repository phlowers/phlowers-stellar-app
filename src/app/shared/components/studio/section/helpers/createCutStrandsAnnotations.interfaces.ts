/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data payload attached to the Plotly cut strands marking for click event handling.
 *
 * @remarks
 * Discriminated by `type === 'cutStrands'`. Used by the click handler in
 * `SectionPlotComponent` to open the RRTS tool. A section holds a single saved entry,
 * so the payload needs nothing else.
 *
 * @category Studio
 */
export interface CutStrandsAnnotationData {
  /** Discriminator indicating this annotation is the RRTS cut strands marking. */
  type: 'cutStrands';
}
