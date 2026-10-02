import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { PlotOptions, PLOT_ID } from '@shared/types/plot.types';
import { Section, Study } from '@shared/domain';
import {
  DataError,
  Distance,
  GetSectionOutput,
  ObstacleOutput,
  PythonErrorCode,
  Task,
  TaskError
} from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PlotResolutionService } from './plot-resolution.service';
import { PlotOptionsService } from './plot-options.service';
import { PlotSpanService } from './plot-span.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { Subscription } from 'rxjs';
import { SectionService } from '@services/section/section.service';
import { ChargeData } from '@shared/domain/models/charge.model';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { getBaseClimate } from '@shared/domain/helpers/climate.helpers';
import { alignSectionSpanLoadsToSupports } from './plot-section-loads.helpers';
import { computeMissingFloorDistances, mapFloorToObstacle } from '@shared/domain/floor/floor-form.helpers';
import { hasCutStrand, NO_CUT_STRANDS, toEngineCutStrands } from '@shared/domain/helpers/cut-strands.helpers';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';
import { isEqual } from 'lodash';
import * as plotly from 'plotly.js-dist-min';

@Injectable({
  providedIn: 'root'
})
/** Service managing the Plotly-based section visualization, including data fetching, plot options, and camera state. */
export class PlotService {
  temporaryLoadData: ChargeData | null = null;
  error = signal<TaskError | DataError | null>(null);
  /** Diagnostics (errors and warnings) raised by the Python engine during the last task. */
  diagnostics = signal<PythonDiagnostic[]>([]);

  litData = signal<GetSectionOutput | null>(null);
  baseLitData = signal<GetSectionOutput | null>(null);
  /** Distance/angle measurement point groups registered in the position engine, rendered like obstacles. */
  distanceMeasuringPoints = signal<ObstacleOutput['obstacles']>([]);
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);

  isStudioActive = signal<boolean>(false);
  study = signal<Study | null>(null);

  // Cut strands the outputs in litData were calculated with
  private readonly projectedCutStrands = signal<number[]>(NO_CUT_STRANDS);
  // Whether the outputs in litData account for at least one cut strand
  readonly isCutStrandApplied = computed(() => hasCutStrand(this.projectedCutStrands()));

  private readonly resolutionService = inject(PlotResolutionService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly spanService = inject(PlotSpanService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly cableService = inject(CablesService);
  private readonly sectionService = inject(SectionService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly logger = inject(LoggerService);
  private readonly obstacleStateService = inject(ObstacleStateService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  /** UUID of the section currently loaded in the Python engine — used to skip redundant initSectionStudio calls. */
  private currentSectionUuid: string | null = null;
  // High safety of the engine study, to skip redundant setHighSafety calls. Null while no engine study is ready
  private highSafety: boolean | null = null;
  // Staff presence on the selected charge requires high safety in the engine study.
  // Without selected charge, staff is assumed present: the safest case
  private readonly selectedChargeHighSafety = computed(() => {
    const section = this.spanService.section();
    const selectedCharge = section?.charges?.find((charge) => charge.uuid === section.selected_charge_uuid);
    return selectedCharge?.personnelPresence ?? true;
  });
  // Cut strands of the engine study, to skip redundant setCutStrands calls. Null while no engine study is ready
  private cutStrands: number[] | null = null;
  private readonly savedCutStrands = computed(() => toEngineCutStrands(this.spanService.savedCutStrands()), {
    equal: isEqual
  });

  constructor() {
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      const section = this.spanService.section();
      if (this.isStudioActive() && this.workerReady() && section) {
        if (section.uuid !== this.currentSectionUuid) {
          void this.initSectionStudio(section);
        }
      }
    });
    // The studio section is reloaded from the database after every charge change (selection, creation,
    // duplication, deletion, edition), so the engine study follows the selected charge from here
    effect(() => {
      const highSafety = this.selectedChargeHighSafety();
      untracked(() => void this.syncHighSafety(highSafety));
    });
    // The RRTS tool saves and deletes the cut strands of the studio section, which the engine study follows
    effect(() => {
      this.savedCutStrands();
      untracked(() => void this.syncCutStrands());
    });
    // Restore the view and camera captured when free positioning mode was switched on. Lives here
    // (not in PlotOptionsService) because restoring the support window requires refreshProjection,
    // and PlotOptionsService cannot inject PlotService (circular dependency). Single generic exit
    // point: it fires no matter which control turned the mode off (toggle, tab change, plot
    // destroy, auto-exit effect).
    effect(() => {
      const savedView = this.plotOptionsService.freePositioningSavedView();
      if (this.plotOptionsService.isFreePositioningMode() || !savedView) {
        return;
      }
      untracked(() => {
        this.plotOptionsService.freePositioningSavedView.set(null);
        if (savedView.camera) {
          // Consumed by SectionPlotComponent after the first 3D render following the restore.
          this.plotOptionsService.pendingCameraRestore.set(savedView.camera);
        }
        this.plotOptionsChange({ ...savedView.plotOptions });
      });
    });
  }

  resetAll = () => {
    this.purgePlot();
    this.error.set(null);
    this.diagnostics.set([]);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.projectedCutStrands.set(NO_CUT_STRANDS);
    this.distanceMeasuringPoints.set([]);
    this.loading.set(false);
    this.plotOptionsService.reset();
    this.spanService.reset();
    this.isStudioActive.set(false);
    this.spanService.section.set(null);
    this.study.set(null);
    this.currentSectionUuid = null;
    this.highSafety = null;
    this.cutStrands = null;
    this.obstacleStateService.reset();
    this.obstaclesService.setSelectedMeasure(null, null);
    this.sideTabsService.sideTabs.set(null);
  };

  modifySection = (sectionData: Partial<Section>) => {
    const study = this.study();
    const section = this.spanService.section();
    if (!study || !section) {
      return;
    }
    return this.sectionService.createOrUpdateSection(study, {
      ...section,
      ...sectionData
    });
  };

  plotOptionsChange(values: Partial<PlotOptions>): void {
    if ('startSupport' in values || 'endSupport' in values) {
      const currentOptions = this.plotOptionsService.plotOptions();
      const newOptions = { ...currentOptions, ...values };
      const diff = Math.abs(newOptions.endSupport - newOptions.startSupport);
      if (diff === 1) {
        this.spanService.spanAmountChoice.set('single');
      } else if (diff === 2) {
        this.spanService.spanAmountChoice.set('double');
      } else {
        this.spanService.spanAmountChoice.set('all');
      }
    }
    this.plotOptionsService.plotOptionsChange(
      values,
      () => this.loading(),
      () => this.refreshProjection()
    );
  }

  initSectionStudio = async (section: Section) => {
    this.currentSectionUuid = section?.uuid ?? null;
    // The engine study is being replaced: high safety and cut strands are applied once the new one exists
    this.highSafety = null;
    this.cutStrands = null;
    this.error.set(null);
    this.diagnostics.set([]);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.projectedCutStrands.set(NO_CUT_STRANDS);
    this.spanService.section.set(section);
    if (!this.workerPythonService.ready || !section?.cable_name) {
      this.logger.error('refreshSection error');
      this.error.set(DataError.NO_CABLE_FOUND);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const cable = await this.cableService.getCable(section.cable_name);
    if (!cable) {
      this.logger.error('no cable found: ', section.cable_name);
      this.loading.set(false);
      this.error.set(DataError.NO_CABLE_FOUND);
      return;
    }
    const { result, error, diagnostics } = await this.workerPythonService.runTask(Task.initLit, {
      section: alignSectionSpanLoadsToSupports(section),
      cable
    });
    this.error.set(error);
    this.diagnostics.set(diagnostics);

    if (error || !result?.success) {
      this.obstacleStateService.reset();
      this.loading.set(false);
      return;
    }

    // A new engine study has no high safety. Read the latest section, the selected charge may have changed during initLit
    await this.applyHighSafety(untracked(() => this.selectedChargeHighSafety()));

    // A new engine study has no cut strands either: the saved ones are part of the section, like high safety
    this.cutStrands = NO_CUT_STRANDS;
    const savedCutStrands = untracked(() => this.savedCutStrands());
    if (!isEqual(savedCutStrands, this.cutStrands)) {
      await this.applyCutStrands(savedCutStrands);
    }

    // When no charge is selected, apply base climate so the engine reflects
    // the default state (wind=0, ice=0, base temperature) instead of the raw
    // initial conditions left by initLit.
    // if (!section.selected_charge_uuid) {
    const baseClimate = getBaseClimate(section);
    await this.workerPythonService.runTask(Task.changeState, { climate: baseClimate, reload: true });
    // }

    // Floors are registered as a specific obstacle type to reuse the obstacle worker's
    // distance-to-cable calculation — see `mapFloorToObstacle`.
    const floorObstacles = (section.floors ?? []).map((floor) =>
      mapFloorToObstacle(
        floor,
        section.supports.findIndex((support) => support.uuid === floor.supportUuid)
      )
    );
    const obstacles = [...(section.obstacles ?? []), ...floorObstacles];
    if (obstacles.length > 0) {
      await this.obstacleStateService.syncObstacles(
        obstacles,
        untracked(() => this.plotOptionsService.plotOptions())
      );
    }

    // initLit initializes the study — refreshProjection gets the actual render data
    await this.refreshProjection();
  };

  refreshProjection = async () => {
    this.loading.set(true);
    const plotOptions = this.plotOptionsService.plotOptions();
    // The engine study calculates the outputs with the cut strands it holds when the projection is requested
    const cutStrands = this.cutStrands ?? NO_CUT_STRANDS;
    const { result, error, diagnostics } = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
    this.litData.set(result?.sectionOutput?.current ?? null);
    this.baseLitData.set(result?.sectionOutput?.base ?? null);
    this.projectedCutStrands.set(cutStrands);
    const currentLitData = result?.sectionOutput?.current ?? null;
    const obstacles = result?.obstacles ?? [];
    if (currentLitData && obstacles.length > 0) {
      this.litData.set({ ...currentLitData, obstacles });
    }
    this.obstacleStateService.setDistances(
      this.withFloorFallbackDistances(result?.distances ?? [], obstacles, currentLitData)
    );
    this.distanceMeasuringPoints.set(result?.distanceMeasuringPoints ?? []);
    this.error.set(error);
    this.diagnostics.set(this.withoutFloorIntersectionWarnings(diagnostics));

    const scalingFactors = untracked(() => this.plotOptionsService.scalingFactors());
    await this.updateAspectRatio(scalingFactors, plotOptions);

    this.loading.set(false);
  };

  /**
   * Completes the engine's distances with the floor points it skipped — always a floor's first and
   * last points, which sit on the supports — so selecting them still shows a vertical distance.
   * See `computeMissingFloorDistances`.
   */
  private withFloorFallbackDistances(
    distances: Distance[],
    obstacles: ObstacleOutput['obstacles'],
    litData: GetSectionOutput | null
  ): Distance[] {
    const floors = this.spanService.section()?.floors ?? [];
    if (!floors.length || !litData) {
      return distances;
    }
    const completed = [...distances];
    for (const floor of floors) {
      const floorPoints = obstacles.find((obstacle) => obstacle.uuid === floor.uuid)?.points;
      const cablePoints = litData.coords?.spans?.[this.spanService.getSupportIndex(floor.supportUuid)];
      if (!floorPoints || !cablePoints) {
        continue;
      }
      const index = completed.findIndex((distance) => distance.obstacleUuid === floor.uuid);
      const measuredPoints = index >= 0 ? completed[index].points : [];
      const missing = computeMissingFloorDistances(
        floorPoints,
        cablePoints,
        new Set(measuredPoints.map((point) => point.pointIndex))
      );
      if (!missing.length) {
        continue;
      }
      const points = [...measuredPoints, ...missing].sort((a, b) => a.pointIndex - b.pointIndex);
      if (index >= 0) {
        completed[index] = { ...completed[index], points };
      } else {
        completed.push({ obstacleUuid: floor.uuid, points });
      }
    }
    return completed;
  }

  /**
   * Drops the engine's "distance plane does not intersect the cable" warning when it is about a
   * floor. A floor's end points sit on the supports themselves, where the plane has no cable to
   * intersect — the cable hangs off the support axis — so the engine skips those points and warns
   * for every saved floor, whatever its clearance. The floor's own clearance and those points'
   * distances are computed from the rendered polylines instead (`computeFloorClearance`,
   * `computeMissingFloorDistances`), so the warning carries no information
   * here; obstacles keep it, where it does mean their point could not be measured.
   */
  private withoutFloorIntersectionWarnings(diagnostics: PythonDiagnostic[]): PythonDiagnostic[] {
    const floorUuids = this.spanService.section()?.floors?.map((floor) => floor.uuid) ?? [];
    if (!floorUuids.length) {
      return diagnostics;
    }
    return diagnostics.filter(
      (diagnostic) =>
        diagnostic.code !== PythonErrorCode.NoIntersectionPlaneWarning ||
        !floorUuids.some((uuid) => diagnostic.rawText.includes(uuid))
    );
  }

  /**
   * Purge the Plotly instance attached to the plot DOM element.
   *
   * Must NOT mutate service state: it runs from SectionPlotComponent.ngOnDestroy,
   * which fires whenever the studio template swaps the plot out for the loading
   * spinner or the error image. Resetting loading/error here would immediately
   * deactivate the branch that triggered the swap (e.g. the spinner cancels
   * itself one frame after appearing — bug "no loading animation on studio
   * reopen"). State cleanup belongs to resetAll.
   */
  purgePlot = () => {
    if (!this.document.getElementById(PLOT_ID)) {
      return;
    }
    plotly.purge(PLOT_ID);
  };

  // Staff presence on the selected charge changed in the studio: the engine study and the outputs depending on it follow
  private async syncHighSafety(highSafety: boolean): Promise<void> {
    // Outside the studio, or before initSectionStudio created the engine study, there is nothing to update
    if (!this.isStudioActive() || this.highSafety === null || highSafety === this.highSafety) return;
    await this.applyHighSafety(highSafety);
    await this.refreshProjection();
  }

  private async applyHighSafety(highSafety: boolean): Promise<void> {
    const previous = this.highSafety;
    // Cached before the call: the worker runs tasks in order, so the last request sent wins
    this.highSafety = highSafety;
    const { error } = await this.workerPythonService.runTask(Task.setHighSafety, { highSafety });
    // Only roll back if no newer request replaced this one in the meantime
    if (error && this.highSafety === highSafety) {
      this.highSafety = previous;
    }
  }

  // The RRTS tool saved or deleted the cut strands of the studio section: the engine study and the outputs depending on
  // them follow. The RRTS tool awaits it, so that none of its calculations runs in between
  async syncCutStrands(): Promise<void> {
    // Outside the studio, or while the engine study still belongs to the previous section, there is nothing to update:
    // initSectionStudio applies them
    if (!this.isStudioActive() || this.spanService.section()?.uuid !== this.currentSectionUuid) return;
    await this.updateCutStrands();
  }

  // The RRTS tool calculated with other cut strands: the engine study gets the saved ones back, in the studio as in the
  // preview of a section being edited
  async restoreCutStrands(calculated: number[]): Promise<void> {
    if (this.cutStrands === null) return;
    // The engine study holds the calculated ones until the saved ones are back
    this.cutStrands = calculated;
    await this.updateCutStrands();
  }

  private async updateCutStrands(): Promise<void> {
    const cutStrands = this.savedCutStrands();
    // Before initSectionStudio created the engine study, there is nothing to update
    if (this.cutStrands === null) return;
    if (!isEqual(cutStrands, this.cutStrands) && !(await this.applyCutStrands(cutStrands))) return;
    // Not when the engine study was dropped (the studio was left), or a newer request replaced this one, in the meantime
    if (isEqual(cutStrands, this.cutStrands) && !isEqual(cutStrands, this.projectedCutStrands())) {
      await this.refreshProjection();
    }
  }

  // A failure is reported, not thrown: the studio goes on with the cut strands the engine study still holds
  private async applyCutStrands(cutStrands: number[]): Promise<boolean> {
    const previous = this.cutStrands;
    // Cached before the call: the worker runs tasks in order, so the last request sent wins
    this.cutStrands = cutStrands;
    const { error } = await this.workerPythonService.runTask(Task.setCutStrands, { cutStrands });
    if (!error) return true;

    // Only roll back if no newer request replaced this one in the meantime
    if (this.cutStrands === cutStrands) {
      this.cutStrands = previous;
    }
    this.logger.error('Failed to apply the saved RRTS cut strands', error);
    if (this.isStudioActive()) {
      this.notificationService.error(this.translocoService.translate('studio.rrts-cut-strands.failed-to-sync'));
    }
    return false;
  }

  private async updateAspectRatio(
    scalingFactors: { x: number; y: number; z: number },
    plotOptions: PlotOptions
  ): Promise<void> {
    const { result } = await this.workerPythonService.runTask(Task.getAspectRatio, {
      ...scalingFactors,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
    if (result) {
      this.plotOptionsService.setAspectRatio(result);
    }
  }
}
