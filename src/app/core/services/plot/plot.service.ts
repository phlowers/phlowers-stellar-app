import { effect, inject, Injectable, signal, untracked, DOCUMENT } from '@angular/core';

import { PlotOptions, PLOT_ID } from '@shared/types/plot.types';
import { Section, Study } from '@shared/domain';
import { DataError, GetSectionOutput, ObstacleOutput, Task, TaskError } from '@services/worker_python/tasks/types';
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

  /** UUID of the section currently loaded in the Python engine — used to skip redundant initSectionStudio calls. */
  private currentSectionUuid: string | null = null;

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
    this.loading.set(false);
    this.plotOptionsService.reset();
    this.spanService.reset();
    this.isStudioActive.set(false);
    this.spanService.section.set(null);
    this.study.set(null);
    this.currentSectionUuid = null;
    this.obstacleStateService.reset();
    this.obstaclesService.setSelectedObstacle(null, null);
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
    const cable = await this.cableService.getCable(section.cable_name);
    if (!cable) {
      this.logger.error('no cable found: ', section.cable_name);
      this.loading.set(false);
      this.error.set(DataError.NO_CABLE_FOUND);
      return;
    }
    const { result, error, diagnostics } = await this.workerPythonService.runTask(Task.initLit, { section, cable });
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

    const obstacles = section.obstacles ?? [];
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
    this.diagnostics.set(diagnostics);

    const scalingFactors = untracked(() => this.plotOptionsService.scalingFactors());
    await this.updateAspectRatio(scalingFactors, plotOptions);

    this.loading.set(false);
  };

  purgePlot = () => {
    if (!this.document.getElementById(PLOT_ID)) {
      return;
    }
    plotly.purge(PLOT_ID);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.distanceMeasuringPoints.set([]);
    this.error.set(null);
    this.diagnostics.set([]);
    this.loading.set(false);
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
