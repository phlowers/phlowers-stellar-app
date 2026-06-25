import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { effect, inject, Injectable, signal } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { recheckSpanLoads } from '@shared/domain/helpers/span-loads.helpers';
import { emptySpanLoad } from '../helpers';
import { getBaseClimate } from '../components/climate/climate.helpers';
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

  /** UUID of the charge case last pushed to the Python engine — prevents redundant setLoads on section updates. */
  private lastLoadedChargeUuid: string | null = null;
  /**
   * Initialize the temporary load data by getting the selected charge case and checking the span loads,
   * then push all span loads into the Python engine via setLoads.
   */
  initTemporaryLoadData = async () => {
    const section = this.spanService.section();
    const currentChargeUuid = section?.selected_charge_uuid;
    if (!currentChargeUuid) {
      this.plotService.temporaryLoadData = null;
      this.lastLoadedChargeUuid = null;
      return;
    }

    // Skip entirely when re-entering for the same charge case
    // (e.g. after save writes back to IndexedDB and liveQuery re-fires).
    if (currentChargeUuid === this.lastLoadedChargeUuid) return;

    const charge = section?.charges?.find((c) => c.uuid === currentChargeUuid);
    if (!charge) {
      this.plotService.temporaryLoadData = null;
      return;
    }
    const newData = cloneDeep(charge.data);
    newData.spanLoads = recheckSpanLoads(newData.spanLoads || [], section?.supports ?? []);
    this.plotService.temporaryLoadData = newData;

    await this.workerPythonService.runTask(Task.setLoads, { spanLoads: newData.spanLoads });
    await this.workerPythonService.runTask(Task.changeState, { climate: newData.climate });
    await this.plotService.refreshProjection();
    this.lastLoadedChargeUuid = currentChargeUuid;
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
   * Persist the temporary load data (inputs only), then calculate to refresh the graph.
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
    await this.calculateLoad();
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

      await this.workerPythonService.runTask(Task.setLoads, {
        spanLoads: checkedSpanLoads
      });
      const {
        result: changeResult,
        error,
        pythonErrorCode
      } = await this.workerPythonService.runTask(Task.changeState, {
        climate: temporaryLoadData.climate
      });

      if (error) {
        this.plotService.error.set(error);
        this.plotService.pythonErrorCode.set(pythonErrorCode);
        return;
      }

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
      // await this.reapplyCableModifications(currentSection);
    } finally {
      this.plotService.loading.set(false);
    }
  };

  /**
   * Apply a single span load to the Python engine and refresh the plot.
   */
  saveSingleLoad = async (supportUuid: string): Promise<void> => {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) return;

    const hasLoad = temporaryLoadData.spanLoads.some((s) => s.supportUuid === supportUuid);
    if (!hasLoad) return;

    this.plotService.loading.set(true);
    try {
      await this.workerPythonService.runTask(Task.setLoads, {
        spanLoads: temporaryLoadData.spanLoads
      });
      await this.plotService.refreshProjection();
    } finally {
      this.plotService.loading.set(false);
    }
  };

  /**
   * Reset the span load for the given support UUID in the engine and refresh the plot.
   */
  async deleteSpanLoad(supportUuid: string): Promise<void> {
    const temporaryLoadData = this.plotService.temporaryLoadData;
    if (!temporaryLoadData) return;

    const spanLoad = temporaryLoadData.spanLoads.find((s) => s.supportUuid === supportUuid);
    if (!spanLoad) return;

    const reset = { ...emptySpanLoad, supportUuid };
    Object.assign(spanLoad, reset);

    const supportIndex = this.spanService.section()?.supports?.findIndex((s) => s.uuid === supportUuid) ?? -1;
    if (supportIndex === -1) return;

    await this.workerPythonService.runTask(Task.deleteLoad, { supportIndex });
    await this.plotService.refreshProjection();
  }

  /**
   * Clear all loads from the Python engine and reset to the default change state
   * (base climate, no span loads), then refresh the plot.
   * The caller is responsible for deleting the charge from the database.
   */
  async deleteLoad(): Promise<void> {
    await this.workerPythonService.runTask(Task.deleteAllLoads, undefined);
    const baseClimate = getBaseClimate(this.spanService.section());
    await this.workerPythonService.runTask(Task.changeState, { climate: baseClimate });
    this.plotService.temporaryLoadData = null;
    this.lastLoadedChargeUuid = null;
    await this.plotService.refreshProjection();
  }
}
