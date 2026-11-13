/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data payload attached to a Plotly cable support manipulation annotation for click event handling.
 *
 * @remarks
 * Discriminated by `type === 'cableSupportManip'`. Used by the click handler in
 * `SectionPlotComponent` to open the Loads side panel on the "Cable support manipulation"
 * tab and pre-select the corresponding support.
 *
 * @category Studio
 */
export interface CableSupportManipAnnotationData {
  /** Discriminator indicating this annotation represents a cable support manipulation. */
  type: 'cableSupportManip';
  /** UUID of the support the manipulation applies to. */
  supportUuid: string;
  /** UUID of the persisted `CableSupportManipulation` entity. */
  cableSupportManipUuid: string;
}
