/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { StudiesService } from '@services/studies/studies.service';
import { CableSupportManipulation, Section } from '@shared/domain';

@Injectable({
  providedIn: 'root'
})
/** Service coordinating cable support manipulation persistence and deletion. */
export class CableSupportManipService {
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly studiesService = inject(StudiesService);

  /**
   * Persist a cable support manipulation in the current section.
   * Matches by supportUuid + chargeUuid so each (support, charge case) pair is independent.
   * Creates a new entry if none exists for that pair, otherwise updates it.
   */
  save = async (manip: Omit<CableSupportManipulation, 'uuid'> & { uuid?: string }): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      const existing = section.cable_support_manipulations?.find(
        (m) => m.supportUuid === manip.supportUuid && m.chargeUuid === manip.chargeUuid
      );
      const toSave: CableSupportManipulation = {
        ...manip,
        uuid: existing?.uuid ?? manip.uuid ?? uuidv4()
      };
      if (existing) {
        section.cable_support_manipulations = (section.cable_support_manipulations ?? []).map((m) =>
          m.uuid === toSave.uuid ? toSave : m
        );
      } else {
        section.cable_support_manipulations = [toSave, ...(section.cable_support_manipulations ?? [])];
      }
      section.selected_cable_support_manipulation_uuid = toSave.uuid;
    });
  };

  /**
   * Remove a cable support manipulation from the current section.
   * If the deleted manipulation was selected, the selection is cleared.
   */
  delete = async (uuid: string): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      section.cable_support_manipulations = (section.cable_support_manipulations ?? []).filter((m) => m.uuid !== uuid);
      if (section.selected_cable_support_manipulation_uuid === uuid) {
        section.selected_cable_support_manipulation_uuid = section.cable_support_manipulations[0]?.uuid ?? null;
      }
    });
  };

  /**
   * Reload the current section from the database and update the plot service state.
   * Call this after any mutation (save, delete) to keep the UI in sync.
   */
  async reloadSection(): Promise<void> {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    this.spanService.section.set(current.section);
  }

  private async mutateCurrentSection(mutate: (section: Section) => void): Promise<void> {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    const { study, section } = current;
    mutate(section);
    await this.studiesService.updateStudy(study);
  }

  private async fetchCurrentSection() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) return null;
    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) return null;
    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (!section) return null;
    return { study, section };
  }
}
