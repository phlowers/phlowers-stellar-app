/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';
import { StudioViewState } from '@shared/types/plot.types';

const STORAGE_KEY_PREFIX = 'stellar-studio-view-';

/**
 * Service providing localStorage-based persistence for the studio view state
 * (camera, span selection, scaling factors, resolution) keyed by section UUID.
 *
 * Saves occur continuously during studio usage (debounced in the consumer)
 * so that the state survives browser refreshes and tab closures where
 * `ngOnDestroy` would not be called.
 */
@Injectable({
  providedIn: 'root'
})
export class StudioViewPersistenceService {
  /**
   * Persists the given view state for a section to localStorage.
   * @param sectionUuid The UUID of the section whose view state is being saved.
   * @param state The view state to persist.
   */
  save(sectionUuid: string, state: StudioViewState): void {
    globalThis.localStorage.setItem(`${STORAGE_KEY_PREFIX}${sectionUuid}`, JSON.stringify(state));
  }

  /**
   * Loads a previously saved view state for a section from localStorage.
   * Returns `null` if no state was found or if the stored value is not valid JSON.
   * @param sectionUuid The UUID of the section whose view state should be loaded.
   */
  load(sectionUuid: string): StudioViewState | null {
    const raw = globalThis.localStorage.getItem(`${STORAGE_KEY_PREFIX}${sectionUuid}`);
    if (raw === null) {
      return null;
    }
    try {
      return JSON.parse(raw) as StudioViewState;
    } catch {
      return null;
    }
  }

  /**
   * Removes the saved view state for a section from localStorage.
   * @param sectionUuid The UUID of the section whose view state should be removed.
   */
  remove(sectionUuid: string): void {
    globalThis.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sectionUuid}`);
  }
}
