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
import * as plotly from 'plotly.js-dist-min';

@Injectable({
  providedIn: 'root'
})
/** Service managing the Plotly-based section visualization, including data fetching, plot options, and camera state. */
export class PlotService {
  temporaryLoadData: ChargeData | null = null;
  error = signal<TaskError | DataError | null>(null);
  pythonErrorCode = signal<PythonErrorCode | null>(null);

  litData = signal<GetSectionOutput | null>(null);
  baseLitData = signal<GetSectionOutput | null>(null);
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);

  isStudioActive = signal<boolean>(false);
  study = signal<Study | null>(null);

  /** Delegate to PlotSpanService.section for backward-compatible access. */
  readonly section = inject(PlotSpanService).section;

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

  constructor() {
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      if (this.isStudioActive() && this.workerReady() && this.spanService.section()) {
        this.refreshSection(this.spanService.section()!);
      }
    });
  }

  resetAll = () => {
    this.purgePlot();
    this.error.set(null);
    this.pythonErrorCode.set(null);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.loading.set(false);
    this.plotOptionsService.reset();
    this.spanService.reset();
    this.isStudioActive.set(false);
    this.spanService.section.set(null);
    this.study.set(null);
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

  refreshSection = async (section: Section) => {
    this.error.set(null);
    this.pythonErrorCode.set(null);
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
    const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.getLit, { section, cable });
    this.baseLitData.set(result?.base ?? null);
    this.error.set(error);
    this.pythonErrorCode.set(pythonErrorCode ?? null);

    if (error) {
      this.obstacleStateService.reset();
      this.loading.set(false);
      return;
    }

    const sectionLitData = result?.current ?? null;
    const obstacles = section.obstacles ?? [];
    if (obstacles.length > 0 && sectionLitData) {
      const syncedOutput = await this.obstacleStateService.syncObstacles(
        obstacles,
        untracked(() => this.plotOptionsService.plotOptions())
      );
      this.litData.set({ ...sectionLitData, obstacles: syncedOutput?.obstacles ?? [] });
    } else {
      this.obstacleStateService.reset();
      this.litData.set(sectionLitData);
    }
    this.loading.set(false);
  };

  refreshProjection = async () => {
    this.loading.set(true);
    const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: this.plotOptionsService.plotOptions().startSupport,
      endSupport: this.plotOptionsService.plotOptions().endSupport,
      view: this.plotOptionsService.plotOptions().view
    });
    this.litData.set(result?.sectionOutput?.current ?? null);
    this.baseLitData.set(result?.sectionOutput?.base ?? null);
    this.obstacleStateService.setDistances(result?.distances ?? []);
    this.error.set(error);
    this.pythonErrorCode.set(pythonErrorCode ?? null);
    this.loading.set(false);
  };

  purgePlot = () => {
    if (!this.document.getElementById(PLOT_ID)) {
      return;
    }
    plotly.purge(PLOT_ID);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.error.set(null);
    this.pythonErrorCode.set(null);
    this.loading.set(false);
  };

  async reapplyObstacles(): Promise<void> {
    const section = untracked(() => this.spanService.section());
    const obstacles = section?.obstacles ?? [];
    const plotOptions = untracked(() => this.plotOptionsService.plotOptions());

    let currentLitData = untracked(() => this.litData());

    // Restore the load-applied base state before re-adding obstacles
    if (this.temporaryLoadData) {
      const { result: loadResult } = await this.workerPythonService.runTask(Task.changeState, {
        climate: this.temporaryLoadData.climate,
        spanLoads: this.temporaryLoadData.spanLoads
      });
      if (loadResult?.current) {
        currentLitData = loadResult.current;
        this.baseLitData.set(loadResult.base ?? null);
      }
    }
    let currentObstacles: ObstacleOutput['obstacles'] = [];

    if (obstacles.length) {
      const { result: obstacleResult } = await this.workerPythonService.runTask(Task.addObstacle, obstacles);
      if (obstacleResult?.obstacles) {
        currentObstacles = obstacleResult.obstacles;
      }
    }

    if (obstacles.length) {
      const { result: distances } = await this.workerPythonService.runTask(Task.calculateObstaclesDistances, {
        startSupport: plotOptions.startSupport,
        endSupport: plotOptions.endSupport,
        view: plotOptions.view
      });
      this.obstacleStateService.setDistances(distances ?? []);
    }

    if (currentLitData && currentObstacles.length > 0) {
      this.litData.set({ ...currentLitData, obstacles: currentObstacles });
    } else {
      this.litData.set(currentLitData);
    }
  }
}
