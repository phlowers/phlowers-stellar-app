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
import { CableSpanManipulation, Section } from '@shared/domain';

@Injectable({
  providedIn: 'root'
})
/** Service coordinating cable span manipulation persistence and deletion. */
export class CableSpanManipService {
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly studiesService = inject(StudiesService);

  // UUID of the span to pre-select in `CableSpanManipComponent`, set when the manipulation icon is clicked on the
  // section plot. The form calls `clearSelectedSpan` once it has consumed it, so the same span can be re-selected.
  readonly selectedSpanUuid = signal<string | null>(null);

  /** Pre-select a span in the cable span manipulation form (called from the plot click handler). */
  selectSpan = (spanUuid: string): void => {
    this.selectedSpanUuid.set(spanUuid);
  };

  /** Clear the pre-selection signal so the same span can be re-selected later. */
  clearSelectedSpan = (): void => {
    this.selectedSpanUuid.set(null);
  };

  /**
   * Clear any persisted form data in memory for a given span.
   * @param _spanUuid UUID of the span whose form data should be cleared
   */
  clearPersistedFormData(_spanUuid: string): void {
    // No-op: extend here if local cache is needed in the future.
  }

  /**
   * Persist a cable span manipulation in the current section.
   * Matches by spanUuid + chargeUuid so each (span, charge case) pair is independent.
   * Creates a new entry if none exists for that pair, otherwise updates it.
   * @param manip The cable span manipulation to save
   */
  save = async (manip: Omit<CableSpanManipulation, 'uuid'> & { uuid?: string }): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      // Legacy records persisted before per-charge tracking have no chargeUuid; treat them as a
      // match for the current charge so saving migrates them in place instead of duplicating.
      const keyMatches = (m: CableSpanManipulation) =>
        m.spanUuid === manip.spanUuid && (m.chargeUuid == null || m.chargeUuid === manip.chargeUuid);
      const existing = section.cable_span_manipulations?.find(keyMatches);
      const toSave: CableSpanManipulation = {
        ...manip,
        uuid: existing?.uuid ?? manip.uuid ?? uuidv4()
      };
      section.cable_span_manipulations = [
        toSave,
        ...(section.cable_span_manipulations ?? []).filter((m) => !keyMatches(m))
      ];
      section.selected_cable_span_manipulation_uuid = toSave.uuid;
      // The copy saved with the load case wins over the section record: it would bring the previous values back
      this.removeFromChargeParams(section, manip.spanUuid, manip.chargeUuid);
    });
  };

  /**
   * Remove a cable span manipulation from the current section, and from the parameters its load case saved.
   * The load initialization restores those parameters into the engine, so a copy left there would bring the
   * manipulation back.
   * If the deleted manipulation was selected, the selection falls back to the first remaining entry, or null.
   * @param uuid UUID of the cable span manipulation to delete
   */
  delete = async (uuid: string): Promise<void> => {
    await this.mutateCurrentSection((section) => {
      const removed = section.cable_span_manipulations?.find((m) => m.uuid === uuid);
      section.cable_span_manipulations = (section.cable_span_manipulations ?? []).filter((m) => m.uuid !== uuid);
      // A manipulation saved without a load case is copied into the load case selected when it is edited
      const chargeUuid = removed?.chargeUuid ?? section.selected_charge_uuid;
      if (removed && chargeUuid) {
        this.removeFromChargeParams(section, removed.spanUuid, chargeUuid);
      }
      if (section.selected_cable_span_manipulation_uuid === uuid) {
        section.selected_cable_span_manipulation_uuid = section.cable_span_manipulations[0]?.uuid ?? null;
      }
    });
  };

  /**
   * Remove a manipulation that only lives in the parameters saved with its load case (applied, then saved with the
   * load case, never saved from the manipulation form).
   * @param spanUuid UUID of the manipulated span
   * @param chargeUuid UUID of the load case
   * @returns whether a manipulation was removed
   */
  deleteFromCharge = async (spanUuid: string, chargeUuid: string): Promise<boolean> => {
    const current = await this.fetchCurrentSection();
    if (!current || !this.removeFromChargeParams(current.section, spanUuid, chargeUuid)) return false;
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

  // Matched by (span, load case) and not by uuid: the copy saved with the load case may carry another uuid
  private removeFromChargeParams(section: Section, spanUuid: string, chargeUuid: string): boolean {
    const charge = section.charges?.find((c) => c?.uuid === chargeUuid);
    const params = charge?.data?.spanManipParams;
    const isTarget = (m: CableSpanManipulation) => m.spanUuid === spanUuid && m.chargeUuid === chargeUuid;
    if (!charge || !params?.some(isTarget)) return false;
    charge.data.spanManipParams = params.filter((m) => !isTarget(m));
    return true;
  }

  /** Apply a synchronous mutation to the current section and persist the updated study. */
  private async mutateCurrentSection(mutate: (section: Section) => void): Promise<void> {
    const current = await this.fetchCurrentSection();
    if (!current) return;
    const { study, section } = current;
    mutate(section);
    await this.studiesService.updateStudy(study);
  }

  /** Fetch the active study and section from the database. Returns null if either is unavailable. */
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
