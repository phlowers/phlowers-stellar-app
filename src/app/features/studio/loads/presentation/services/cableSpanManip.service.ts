/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { PlotService } from '@services/plot/plot.service';
import { StudiesService } from '@services/studies/studies.service';
import { CableSpanManipulation } from '@shared/domain';

@Injectable({
  providedIn: 'root'
})
/** Service coordinating cable span manipulation persistence and deletion. */
export class CableSpanManipService {
  private readonly plotService = inject(PlotService);
  private readonly studiesService = inject(StudiesService);

  /**
   * Clear any persisted form data in memory for a given span.
   * @param _spanUuid UUID of the span whose form data should be cleared
   */
  clearPersistedFormData(_spanUuid: string): void {
    // No-op: extend here if local cache is needed in the future.
  }

  /**
   * Persist a cable span manipulation in the current section.
   * Creates a new entry if no manipulation exists for the span, otherwise updates it.
   * @param manip The cable span manipulation to save
   */
  save = async (manip: Omit<CableSpanManipulation, 'uuid'> & { uuid?: string }): Promise<void> => {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    const { study, section } = current;

    const existingForSpan = section.cable_span_manipulations?.find((m) => m.spanUuid === manip.spanUuid);

    const toSave: CableSpanManipulation = {
      ...manip,
      uuid: existingForSpan?.uuid ?? manip.uuid ?? uuidv4()
    };

    if (existingForSpan) {
      section.cable_span_manipulations = section.cable_span_manipulations.map((m) =>
        m.spanUuid === toSave.spanUuid ? toSave : m
      );
    } else {
      section.cable_span_manipulations = [toSave, ...(section.cable_span_manipulations ?? [])];
    }
    section.selected_cable_span_manipulation_uuid = toSave.uuid;

    await this.studiesService.updateStudy(study);
  };

  /**
   * Remove a cable span manipulation from the current section.
   * If the deleted manipulation was selected, the selection is cleared.
   * @param uuid UUID of the cable span manipulation to delete
   */
  delete = async (uuid: string): Promise<void> => {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    const { study, section } = current;

    section.cable_span_manipulations = (section.cable_span_manipulations ?? []).filter((m) => m.uuid !== uuid);
    if (section.selected_cable_span_manipulation_uuid === uuid) {
      section.selected_cable_span_manipulation_uuid = section.cable_span_manipulations[0]?.uuid ?? null;
    }

    await this.studiesService.updateStudy(study);
  };

  /**
   * Reload the current section from the database and update the plot service state.
   * Call this after any mutation (save, delete) to keep the UI in sync.
   */
  async reloadSection(): Promise<void> {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    this.plotService.section.set(current.section);
  }

  /** Fetch the active study and section from the database. Returns null if either is unavailable. */
  private async fetchCurrentSection() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) return null;
    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) return null;
    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (!section) return null;
    return { study, section };
  }
}
