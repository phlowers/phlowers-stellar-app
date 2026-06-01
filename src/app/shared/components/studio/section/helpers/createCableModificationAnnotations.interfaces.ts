/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Data payload attached to a Plotly cable modification annotation for click event handling.
 *
 * @remarks
 * Discriminated by `type === 'cableModification'`. Used by the click handler in
 * `SectionPlotComponent` to open the Loads side panel on the "Cable length change"
 * tab and pre-select the corresponding modification.
 *
 * @category Studio
 */
export interface CableModificationAnnotationData {
  /** Discriminator indicating this annotation represents a cable length modification. */
  type: 'cableModification';
  /** UUID of the span (left support) the modification applies to. */
  spanUuid: string;
  /** UUID of the persisted `CableModification` entity. */
  cableModificationUuid: string;
}
