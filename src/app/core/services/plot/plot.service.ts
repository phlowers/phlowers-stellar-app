import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { PlotOptions, PLOT_ID } from '@shared/types/plot.types';
import { Section, Study } from '@shared/domain';
import {
  DataError,
  GetSectionOutput,
  ObstacleOutput,
  PythonErrorCode,
  Task,
  TaskError
} from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { formatDiagnosticsError } from '@services/worker_python/tasks/python-error-messages';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoService } from '@jsverse/transloco';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PlotResolutionService } from './plot-resolution.service';
import { PlotOptionsService } from './plot-options.service';
import { PlotSpanService } from './plot-span.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import { Subscription } from 'rxjs';
import { SectionService } from '@services/section/section.service';
import { ChargeData } from '@shared/domain/models/charge.model';
import { CUT_STRANDS_LAYER_COUNT, sumCutStrands } from '@shared/domain/helpers/sections.helpers';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { getBaseClimate } from '@shared/domain/helpers/climate.helpers';
import { alignSectionSpanLoadsToSupports } from './plot-section-loads.helpers';
import { mapFloorToObstacle } from '@shared/domain/floor/floor-form.helpers';
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

  // Cut-strand results are never persisted: they are recomputed from the section's saved
  // cut strands on studio init, and by the RRTS dialog on each calculation.
  // Residual rated tensile strength of the cable with the cut strands applied (daN)
  rrts = signal<number | null>(null);
  // Utilization rate per span (%) with the cut strands applied
  cutStrandsUtilizationRates = signal<number[] | null>(null);
  // Utilization rate per span (%) of the undamaged cable, in the same engine state as above
  baseUtilizationRates = signal<number[] | null>(null);

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
  private readonly document = inject(DOCUMENT);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

  /** UUID of the section currently loaded in the Python engine — used to skip redundant initSectionStudio calls. */
  private currentSectionUuid: string | null = null;
  // Cut strands the engine holds and the RRTS results match; null for a freshly initialized (undamaged) engine
  private appliedCutStrands: number[] | null = null;
  // Tail of the queue of multi-task engine sequences (init, cut strands, projection): they share one engine state
  private engineQueue: Promise<unknown> = Promise.resolve();

  constructor() {
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      const section = this.spanService.section();
      if (this.isStudioActive() && this.workerReady() && section) {
        if (section.uuid !== this.currentSectionUuid) {
          this.initSectionStudio(section);
        }
      }
    });
  }

  resetAll = () => {
    this.purgePlot();
    this.error.set(null);
    this.diagnostics.set([]);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.distanceMeasuringPoints.set([]);
    this.loading.set(false);
    this.plotOptionsService.reset();
    this.spanService.reset();
    this.isStudioActive.set(false);
    this.spanService.section.set(null);
    this.study.set(null);
    this.currentSectionUuid = null;
    this.appliedCutStrands = null;
    this.rrts.set(null);
    this.cutStrandsUtilizationRates.set(null);
    this.baseUtilizationRates.set(null);
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
    this.error.set(null);
    this.diagnostics.set([]);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.spanService.section.set(section);
    if (!this.workerPythonService.ready || !section?.cable_name) {
      this.logger.error('refreshSection error');
      this.error.set(DataError.NO_CABLE_FOUND);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    // The resets above stay synchronous: the studio relies on litData being nulled right away
    const cableName = section.cable_name;
    return this.serialize(() => this.initEngine(section, cableName));
  };

  private initEngine = async (section: Section, cableName: string) => {
    const cable = await this.cableService.getCable(cableName);
    if (!cable) {
      this.logger.error('no cable found: ', cableName);
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

    // Saved cut strands are inputs only: replay them on the freshly initialized engine
    // so the plot and the RRTS results reflect the damaged cable again.
    this.rrts.set(null);
    this.cutStrandsUtilizationRates.set(null);
    this.baseUtilizationRates.set(null);
    this.appliedCutStrands = null;
    const savedCutStrands = section.rrts_cut_strands;
    if (savedCutStrands?.length) {
      // On failure the engine stays undamaged: the plot still renders, the user is told why RRTS is missing
      const replayDiagnostics = await this.applyCutStrandsNow(sumCutStrands(savedCutStrands));
      if (replayDiagnostics) {
        this.notificationService.error(formatDiagnosticsError(replayDiagnostics, this.translocoService));
      }
    }

    // initLit initializes the study — refreshProjection gets the actual render data
    await this.refreshProjectionNow();
  };

  // Apply cut strands to the engine and refresh the RRTS results.
  // Returns the diagnostics of the failing task, or null on success.
  applyCutStrands = (cutStrands: number[]) => this.serialize(() => this.applyCutStrandsNow(cutStrands));

  // Put the engine back to the undamaged cable and drop the cut-strand results. Never rolls back:
  // it restores the persisted state (no saved entry), whatever was applied before.
  clearCutStrands = () =>
    this.serialize(async (): Promise<PythonDiagnostic[] | null> => {
      this.appliedCutStrands = null;
      this.rrts.set(null);
      this.cutStrandsUtilizationRates.set(null);
      const res = await this.workerPythonService.runTask(Task.setCutStrands, {
        cutStrands: new Array<number>(CUT_STRANDS_LAYER_COUNT).fill(0)
      });
      return res.error ? res.diagnostics : null;
    });

  refreshProjection = () => this.serialize(() => this.refreshProjectionNow());

  // Run fn once every queued engine sequence has settled, so their tasks never interleave on the engine.
  // Queued sequences must call the *Now variants: going through the queue again would wait on themselves.
  // Only PlotService sequences are queued; loads/obstacles/floors tasks still post directly, route them here if they race.
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.engineQueue.then(fn, fn);
    this.engineQueue = run.catch(() => undefined);
    return run;
  }

  private applyCutStrandsNow = async (cutStrands: number[]): Promise<PythonDiagnostic[] | null> => {
    const worker = this.workerPythonService;
    // Set first: the engine validates the cut strands before changing anything
    const setRes = await worker.runTask(Task.setCutStrands, { cutStrands });
    if (setRes.error) return setRes.diagnostics;
    // Past this point the engine holds the new damage: put back the one the displayed results match
    const rollback = async (diagnostics: PythonDiagnostic[]) => {
      await worker.runTask(Task.setCutStrands, {
        cutStrands: this.appliedCutStrands ?? new Array<number>(cutStrands.length).fill(0)
      });
      return diagnostics;
    };
    const rrtsRes = await worker.runTask(Task.getRrts, undefined);
    if (rrtsRes.error || !rrtsRes.result) return rollback(rrtsRes.diagnostics);
    const rateRes = await worker.runTask(Task.getUtilizationRate, undefined);
    if (rateRes.error || !rateRes.result) return rollback(rateRes.diagnostics);

    // Undamaged rates in the same engine state, then put the damage back
    const resetRes = await worker.runTask(Task.setCutStrands, {
      cutStrands: new Array<number>(cutStrands.length).fill(0)
    });
    if (resetRes.error) return rollback(resetRes.diagnostics);
    const baseRateRes = await worker.runTask(Task.getUtilizationRate, undefined);
    if (baseRateRes.error || !baseRateRes.result) return rollback(baseRateRes.diagnostics);
    const restoreRes = await worker.runTask(Task.setCutStrands, { cutStrands });
    if (restoreRes.error) return rollback(restoreRes.diagnostics);

    // The engine returns the RRTS in N, displayed in daN like the other tensions
    this.rrts.set(rrtsRes.result.rrts / 10);
    this.cutStrandsUtilizationRates.set(rateRes.result.utilizationRate);
    this.baseUtilizationRates.set(baseRateRes.result.utilizationRate);
    this.appliedCutStrands = cutStrands;
    return null;
  };

  private refreshProjectionNow = async () => {
    this.loading.set(true);
    const plotOptions = this.plotOptionsService.plotOptions();
    const { result, error, diagnostics } = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      view: plotOptions.view
    });
    this.litData.set(result?.sectionOutput?.current ?? null);
    this.baseLitData.set(result?.sectionOutput?.base ?? null);
    const currentLitData = result?.sectionOutput?.current ?? null;
    const obstacles = result?.obstacles ?? [];
    if (currentLitData && obstacles.length > 0) {
      this.litData.set({ ...currentLitData, obstacles });
    }
    this.obstacleStateService.setDistances(result?.distances ?? []);
    this.distanceMeasuringPoints.set(result?.distanceMeasuringPoints ?? []);
    this.error.set(error);
    this.diagnostics.set(this.withoutFloorIntersectionWarnings(diagnostics));

    const scalingFactors = untracked(() => this.plotOptionsService.scalingFactors());
    await this.updateAspectRatio(scalingFactors, plotOptions);

    this.loading.set(false);
  };

  /**
   * Drops the engine's "distance plane does not intersect the cable" warning when it is about a
   * floor. A floor's end points sit on the supports themselves, where the plane has no cable to
   * intersect — the cable hangs off the support axis — so the engine skips those points and warns
   * for every saved floor, whatever its clearance. The floor's own clearance is computed from the
   * rendered polylines instead (`computeFloorClearance`), so the warning carries no information
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
