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
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

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
  private readonly obstacleStateService = inject(ObstacleStateService);

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
    if (changeResult) {
      this.plotService.litData.set(changeResult.current);
      this.plotService.baseLitData.set(changeResult.base);
    }

    const obstacles = currentSection?.obstacles ?? [];
    if (obstacles.length > 0) {
      const syncedOutput = await this.obstacleStateService.syncObstacles(
        obstacles,
        this.plotOptionsService.plotOptions()
      );
      if (syncedOutput) {
        const current = this.plotService.litData();
        if (current) {
          this.plotService.litData.set({ ...current, obstacles: syncedOutput.obstacles });
        }
      }
    }

    this.plotService.loading.set(false);
  };

  /**
   * Reset the span load for the given support UUID to its empty state.
   */
  deleteSpanLoad(supportUuid: string): void {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) return;

    const spanLoad = temporaryLoadData.spanLoads.find((s) => s.supportUuid === supportUuid);
    if (!spanLoad) return;

    const reset = { ...emptySpanLoad, supportUuid };
    Object.assign(spanLoad, reset);
  }

  /**
   * Delete the load by deleting the charge case
   */
  deleteLoad() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    const chargeUuid = this.spanService.section()?.selected_charge_uuid;
    if (!studyUuid || !sectionUuid || !chargeUuid) return;
    this.chargesService.deleteCharge(studyUuid, sectionUuid, chargeUuid);
  }
}
