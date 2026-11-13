/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable, signal } from '@angular/core';
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

  // UUID of the support to pre-select in `CableSupportManipComponent`, set when the manipulation icon is clicked on the
  // section plot. The form calls `clearSelectedSupport` once it has consumed it, so the same support can be re-selected.
  readonly selectedSupportUuid = signal<string | null>(null);

  /** Pre-select a support in the cable support manipulation form (called from the plot click handler). */
  selectSupport = (supportUuid: string): void => {
    this.selectedSupportUuid.set(supportUuid);
  };

  /** Clear the pre-selection signal so the same support can be re-selected later. */
  clearSelectedSupport = (): void => {
    this.selectedSupportUuid.set(null);
  };

  /**
   * Persist a cable support manipulation in the current section.
   * Matches by supportUuid + chargeUuid so each (support, charge case) pair is independent.
   * Creates a new entry if none exists for that pair, otherwise updates it.
   */
  save = async (manip: Omit<CableSupportManipulation, 'uuid'> & { uuid?: string }): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      const keyMatches = (m: CableSupportManipulation) =>
        m.supportUuid === manip.supportUuid && m.chargeUuid === manip.chargeUuid;
      const existing = section.cable_support_manipulations?.find(keyMatches);
      const toSave: CableSupportManipulation = {
        ...manip,
        uuid: existing?.uuid ?? manip.uuid ?? uuidv4()
      };
      section.cable_support_manipulations = [
        toSave,
        ...(section.cable_support_manipulations ?? []).filter((m) => !keyMatches(m))
      ];
      section.selected_cable_support_manipulation_uuid = toSave.uuid;
    });
  };

  /**
   * Remove a cable support manipulation from the current section, and from the parameters its load case saved.
   * The load initialization restores those parameters into the engine, so a copy left there would bring the
   * manipulation back.
   * If the deleted manipulation was selected, the selection falls back to the first remaining entry, or null.
   */
  delete = async (uuid: string): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      const removed = section.cable_support_manipulations?.find((m) => m.uuid === uuid);
      section.cable_support_manipulations = (section.cable_support_manipulations ?? []).filter((m) => m.uuid !== uuid);
      if (removed) {
        this.removeFromChargeParams(section, removed.supportUuid, removed.chargeUuid);
      }
      if (section.selected_cable_support_manipulation_uuid === uuid) {
        section.selected_cable_support_manipulation_uuid = section.cable_support_manipulations[0]?.uuid ?? null;
      }
    });
  };

  /**
   * Remove a manipulation that only lives in the parameters saved with its load case (applied, then saved with the
   * load case, never saved from the manipulation form).
   * @returns whether a manipulation was removed
   */
  deleteFromCharge = async (supportUuid: string, chargeUuid: string): Promise<boolean> => {
    const current = await this.fetchCurrentSection();
    if (!current || !this.removeFromChargeParams(current.section, supportUuid, chargeUuid)) return false;
    await this.studiesService.updateStudy(current.study);
    return true;
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

  // Matched by (support, load case) and not by uuid: the copy saved with the load case may carry another uuid
  private removeFromChargeParams(section: Section, supportUuid: string, chargeUuid: string): boolean {
    const charge = section.charges?.find((c) => c?.uuid === chargeUuid);
    const params = charge?.data?.supportManipParams;
    const isTarget = (m: CableSupportManipulation) => m.supportUuid === supportUuid && m.chargeUuid === chargeUuid;
    if (!charge || !params?.some(isTarget)) return false;
    charge.data.supportManipParams = params.filter((m) => !isTarget(m));
    return true;
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
