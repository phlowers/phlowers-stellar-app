import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { effect, inject, Injectable, signal } from '@angular/core';
import { cloneDeep } from 'lodash';
import { ChargesService } from '@services/charges/charges.service';
import { recheckSpanLoads } from '@shared/domain/helpers/span-loads.helpers';
import { emptySpanLoad } from '../helpers';
import { getBaseClimate } from '@shared/domain/helpers/climate.helpers';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskError } from '@services/worker_python/tasks/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { CableModification, Section } from '@shared/domain';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { mapFloorToObstacle } from '@shared/domain/floor/floor-form.helpers';

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
    const rawSpanLoads = newData.spanLoads || [];
    const rawCableModif = newData.cableModifParams || [];
    newData.spanLoads = recheckSpanLoads(rawSpanLoads, section?.supports ?? []);

    // ideally, we want to call recheckCableModif and create an initial state,
    // but this cause inconsistencies with python task that only calls manipulations one by one
    // ponytail: merge persisted section.cable_modifications into charge params on import
    newData.cableModifParams = [
      ...rawCableModif,
      ...(section?.cable_modifications?.filter((mod) => !rawCableModif.some((p) => p.spanUuid === mod.spanUuid)) ?? [])
    ];
    this.plotService.temporaryLoadData = newData;
    // Set before async calls so the effect guard prevents concurrent re-entrant
    // invocations (e.g. liveQuery re-firing while setLoads is still in-flight).
    this.lastLoadedChargeUuid = currentChargeUuid;

    try {
      // When there are no saved span loads, pass an empty array so the Python engine
      // takes its "no loads" code path instead of receiving zero-weight placeholder
      // entries created by recheckSpanLoads (which would have the wrong array size).
      await this.applyCableModifications(newData.cableModifParams ?? []);
      await this.workerPythonService.runTask(Task.setLoads, {
        spanLoads: rawSpanLoads.length > 0 ? newData.spanLoads : []
      });
      await this.workerPythonService.runTask(Task.changeState, { climate: newData.climate });
      await this.resyncObstacles(section);
      await this.plotService.refreshProjection();
    } catch (err) {
      this.lastLoadedChargeUuid = null; // Allow retry on next signal change
      this.plotService.error.set(TaskError.CALCULATION_ERROR);
      this.logger.error('initTemporaryLoadData failed', err);
    }
  };

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly chargesService = inject(ChargesService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly logger = inject(LoggerService);
  private readonly obstacleStateService = inject(ObstacleStateService);

  constructor() {
    effect(() => {
      if (!this.plotService.workerReady()) return;
      // Wait for initSectionStudio to complete (litData is populated by refreshProjection after initLit succeeds).
      // Without this gate, setLoads could be posted before initialize_study finishes.
      if (!this.plotService.litData()) return;
      void this.initTemporaryLoadData();
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
   * Sequentially apply cable length modifications in the Python engine.
   *
   * @remarks
   * Must run **awaited and in order**: `manipulations.modify_cable` accumulates into
   * `study.manipulation.shortening_span` one call at a time, and `Task.changeState`
   * (called right after) re-solves assuming all prior manipulations already landed.
   * An unawaited `forEach` here would let `changeState` race ahead of the
   * `shortenLengthenCable` calls, corrupting the engine state (previously
   * collapsing/losing other plot annotations after Calculate).
   *
   * Must also run **before** `Task.setLoads`: the manipulation solve rebuilds
   * `study.position_engine`, discarding load coordinates registered beforehand.
   */
  private async applyCableModifications(modifications: CableModification[]): Promise<void> {
    for (const modification of modifications) {
      const spanIndex = this.spanService.getSupportIndex(modification.spanUuid);
      if (spanIndex < 0) continue;
      await this.workerPythonService.runTask(Task.shortenLengthenCable, {
        spanIndex,
        modificationType: modification.modificationType,
        modifiedLengthCable: modification.modifiedLengthCable,
        distanceSupportRef: modification.distanceSupportRef,
        supportRef: modification.supportRef
      });
    }
  }

  /**
   * Re-register all saved obstacles (and floors, treated as obstacles) in the Python engine.
   *
   * @remarks
   * `Task.shortenLengthenCable` ends in `SectionStudy.solve_adjustment()`, which — when
   * manipulations are registered — replaces `study.position_engine` with a fresh instance,
   * dropping every obstacle previously registered in it. The next `refreshProjection` then
   * returns an empty `obstacles` list, wiping obstacle/floor annotations from the plot even
   * though the underlying section data is untouched. Must run after the cable modifications
   * and before `refreshProjection`. Re-registering an already-known uuid is a no-op.
   */
  private async resyncObstacles(section: Section | null | undefined): Promise<void> {
    const floorObstacles = (section?.floors ?? []).map((floor) =>
      mapFloorToObstacle(
        floor,
        section?.supports.findIndex((support) => support.uuid === floor.supportUuid) ?? -1
      )
    );
    const obstacles = [...(section?.obstacles ?? []), ...floorObstacles];
    if (obstacles.length > 0) {
      await this.obstacleStateService.syncObstacles(obstacles, this.plotOptionsService.plotOptions());
    }
  }

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

      // Must run before setLoads: the manipulation solve rebuilds the engine's position engine,
      // discarding any load coordinates and obstacles registered beforehand.
      await this.applyCableModifications(this.plotService.temporaryLoadData?.cableModifParams ?? []);

      await this.workerPythonService.runTask(Task.setLoads, {
        spanLoads: checkedSpanLoads
      });

      const {
        result: changeResult,
        error,
        diagnostics
      } = await this.workerPythonService.runTask(Task.changeState, {
        climate: temporaryLoadData.climate
      });

      if (error) {
        this.plotService.error.set(error);
        this.plotService.diagnostics.set(diagnostics);
        return;
      }

      if (!changeResult?.success) {
        return;
      }

      await this.resyncObstacles(currentSection);

      // refreshProjection gets all data (litData, baseLitData, obstacles, distances)
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

    this.plotService.loading.set(true);
    try {
      await this.workerPythonService.runTask(Task.deleteLoad, { supportIndex });
      await this.plotService.refreshProjection();
    } finally {
      this.plotService.loading.set(false);
    }
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
