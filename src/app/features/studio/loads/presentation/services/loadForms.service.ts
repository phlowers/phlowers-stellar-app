import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { effect, inject, Injectable, signal } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { recheckSpanLoads } from '@shared/domain/helpers/span-loads.helpers';
import { emptySpanLoad } from '../helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';

@Injectable({
  providedIn: 'root'
})
/** Service coordinating load form state, persisting charge data, and triggering load calculations via the Python worker. */
export class LoadFormsService {
  /** Active tab value for the load p-tabs panel ("0" = Climate, "1" = Load/Marking). */
  readonly activeLoadTab = signal<string>('0');

  /** UUID of the span support to select in the span form, set when clicking a load annotation. Cleared after consumption. */
  readonly selectedSpanSupportUuid = signal<string | null>(null);
  /**
   * Initialize the temporary load data by getting the selected charge case and checking the span loads
   */
  initTemporaryLoadData = () => {
    const currentChargeUuid = this.spanService.section()?.selected_charge_uuid;
    if (!currentChargeUuid) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const charge = this.spanService.section()?.charges?.find((c) => c.uuid === currentChargeUuid);
    if (!charge) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const newData = cloneDeep(charge.data);
    newData.spanLoads = recheckSpanLoads(newData.spanLoads || [], this.spanService.section()?.supports ?? []);
    this.plotService.temporaryLoadData = newData;
  };

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly chargesService = inject(ChargesService);
  private readonly workerPythonService = inject(WorkerPythonService);
  // private readonly obstacleStateService = inject(ObstacleStateService);

  constructor() {
    effect(() => {
      this.initTemporaryLoadData();
    });
  }

  /**
   * Save the temporary load data in the section by creating or updating the charge case
   */
  saveTemporaryLoadDataInSection = async () => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid || !temporaryLoadData) {
      return;
    }
    const currentCharge = await this.chargesService.getSelectedChargeCase(studyUuid, sectionUuid);
    if (!currentCharge) {
      return;
    }
    await this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, {
      ...currentCharge,
      data: temporaryLoadData
    });
  };

  /**
   * Calculate the load by running the changeState task, then re-sync all saved obstacles on top.
   */
  calculateLoad = async () => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) {
      return;
    }
    this.plotOptionsService.refreshCamera();
    this.plotService.loading.set(true);

    try {
      const currentSection = this.spanService.section();
      const checkedSpanLoads = recheckSpanLoads(temporaryLoadData.spanLoads, currentSection?.supports ?? []);
      this.plotService.temporaryLoadData = {
        ...temporaryLoadData,
        spanLoads: checkedSpanLoads
      };

      const { result: changeResult } = await this.workerPythonService.runTask(Task.changeState, {
        climate: temporaryLoadData.climate,
        spanLoads: checkedSpanLoads
      });

      if (!changeResult?.success) {
        return;
      }

      // For me no need to re-sync obstacles here because the obstacles have already been updated before.
      // const obstacles = currentSection?.obstacles ?? [];
      // if (obstacles.length > 0) {
      //   await this.obstacleStateService.syncObstacles(
      //     obstacles,
      //     this.plotOptionsService.plotOptions()
      //   );
      // }

      // refreshProjection gets all data (litData, baseLitData, obstacles, distances)
      await this.plotService.refreshProjection();

      // Re-apply any saved cable length modifications on top of the change-state
      // result. `Task.changeState` resets the engine to the climate state without
      // knowing about cable_modifications, which would otherwise be silently
      // dropped from the recomputed geometry.
      await this.reapplyCableModifications(currentSection);
    } finally {
      this.plotService.loading.set(false);
    }
  };

  /**
   * Re-runs `Task.cableModification` for each saved modification of the
   * current section so the lengthening/shortening effect survives a load
   * recalculation. The last applied modification wins (the Python task uses
   * a single simulated temperature on the whole engine), which matches the
   * current single-modification-per-section product constraint.
   */
  private async reapplyCableModifications(currentSection: ReturnType<PlotSpanService['section']>): Promise<void> {
    const modifications = currentSection?.cable_modifications ?? [];
    if (modifications.length === 0) return;

    const supportUuidToIndex = new Map<string, number>();
    (currentSection?.supports ?? []).forEach((support, index) => {
      supportUuidToIndex.set(support.uuid, index);
    });

    for (const modification of modifications) {
      const spanIndex = supportUuidToIndex.get(modification.spanUuid);
      if (spanIndex === undefined) continue;

      const { result } = await this.workerPythonService.runTask(Task.cableModification, {
        spanIndex,
        widthCable: modification.widthCable,
        sizeCable: modification.sizeCable,
        distanceSupportRef: modification.distanceSupportRef,
        supportRef: modification.supportRef
      });
      if (result) {
        this.plotService.litData.set(result.current);
        this.plotService.baseLitData.set(result.base);
      }
    }
  }

  /**
   * Reset the span load for the given support UUID to its empty state.
   */
  async deleteSpanLoad(supportUuid: string): Promise<void> {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) return;

    const spanLoad = temporaryLoadData.spanLoads.find((s) => s.supportUuid === supportUuid);
    if (!spanLoad) return;

    const reset = { ...emptySpanLoad, supportUuid };
    Object.assign(spanLoad, reset);
    await this.plotService.refreshProjection();
  }

  /**
   * Delete the load by deleting the charge case
   */
  async deleteLoad(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const chargeUuid = this.spanService.section()?.selected_charge_uuid;
    if (!studyUuid || !sectionUuid || !chargeUuid) return;
    await this.chargesService.deleteCharge(studyUuid, sectionUuid, chargeUuid);
    await this.plotService.refreshProjection();
  }
}
