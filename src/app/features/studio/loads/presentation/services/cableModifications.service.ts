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
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { StudiesService } from '@services/studies/studies.service';
import { Task } from '@services/worker_python/tasks/types';
import { CableModification } from '@shared/domain';
import { CableModificationParams } from './cableModifications.service.interfaces';

export type { CableModificationParams };

@Injectable({
  providedIn: 'root'
})
/** Service coordinating cable modification calculations, persistence, and deletion. */
export class CableModificationsService {
  /**
   * Clear any persisted form data in memory for a given span (if such logic is needed).
   * This is a placeholder: adapt if you avez une logique de cache ou de persistance locale.
   * @param spanUuid UUID of the span whose form data should be cleared
   */
  clearPersistedFormData(_spanUuid: string): void {
    // If you have a cache or local storage for form data, clear it here.
    // Example for localStorage:
    // localStorage.removeItem(`cable-span-form-${spanUuid}`);
    // If not used, this is a no-op.
  }
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly studiesService = inject(StudiesService);

  /** Fetch a study by UUID from IndexedDB. */
  getStudy = (studyUuid: string) => this.studiesService.getStudy(studyUuid);

  /**
   * Run the cable modification calculation via the Python worker and update the plot state.
   * @param params Cable modification input parameters
   */
  calculate = async (params: CableModificationParams): Promise<void> => {
    const spanIndex = this.spanService.getSupportIndex(params.spanUuid);
    if (spanIndex < 0) {
      return;
    }

    this.plotOptionsService.refreshCamera();
    this.plotService.loading.set(true);

    const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.cableModification, {
      spanIndex,
      widthCable: params.widthCable,
      sizeCable: params.sizeCable,
      distanceSupportRef: params.distanceSupportRef,
      supportRef: params.supportRef
    });

    this.plotService.litData.set(result?.current ?? null);
    this.plotService.baseLitData.set(result?.base ?? null);
    this.plotService.error.set(error);
    this.plotService.pythonErrorCode.set(pythonErrorCode ?? null);
    this.plotService.loading.set(false);
  };

  /**
   * Persist a cable modification in the current section.
   * Creates a new entry if the UUID does not already exist, otherwise updates it.
   * @param modification The cable modification to save
   */
  save = async (modification: Omit<CableModification, 'uuid'> & { uuid?: string }): Promise<void> => {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      return;
    }

    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) {
      return;
    }

    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (!section) {
      return;
    }

    const existingForSpan = section.cable_modifications?.find((m) => m.spanUuid === modification.spanUuid);

    const toSave: CableModification = {
      ...modification,
      uuid: existingForSpan?.uuid ?? modification.uuid ?? uuidv4()
    };

    if (existingForSpan) {
      section.cable_modifications = section.cable_modifications.map((m) =>
        m.spanUuid === toSave.spanUuid ? toSave : m
      );
    } else {
      section.cable_modifications = [toSave, ...(section.cable_modifications ?? [])];
    }
    section.selected_cable_modification_uuid = toSave.uuid;

    await this.studiesService.updateStudy(study);
  };

  /**
   * Remove a cable modification from the current section.
   * If the deleted modification was selected, the selection is cleared.
   * @param uuid UUID of the cable modification to delete
   */
  delete = async (uuid: string): Promise<void> => {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      return;
    }

    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) {
      return;
    }

    const section = study.sections.find((s) => s?.uuid === sectionUuid);
    if (!section) {
      return;
    }

    section.cable_modifications = (section.cable_modifications ?? []).filter((m) => m.uuid !== uuid);
    if (section.selected_cable_modification_uuid === uuid) {
      section.selected_cable_modification_uuid = section.cable_modifications[0]?.uuid ?? null;
    }

    await this.studiesService.updateStudy(study);
  };
}
