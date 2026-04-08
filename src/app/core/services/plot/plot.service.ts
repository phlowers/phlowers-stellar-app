import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AxesNorms, PlotOptions, PLOT_ID, SelectedDisplayOptions, SpanOption } from '@shared/types/plot.types';
import { DataError, GetSectionOutput, PythonErrorCode, Task, TaskError } from '@services/worker_python/tasks/types';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { Section, Study } from '@shared/domain';
import { Subscription } from 'rxjs';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { PlotResolutionService } from './plot-resolution.service';
import { checkIfProjectionNeedRefresh } from './plot-options.utils';
import { CablesService } from '@shared/catalog/services/cables.service';
import * as plotly from 'plotly.js-dist-min';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';
import { SectionService } from '@services/section/section.service';
import { ChargeData } from '@shared/domain/models/charge.model';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

/** Default plot options used when initializing or resetting the studio view. */
const defaultPlotOptions: PlotOptions = {
  view: '3d',
  side: 'profile',
  startSupport: 0,
  endSupport: 1,
  invert: false
};

const defaultSelectedDisplayOptions: SelectedDisplayOptions = {
  loads: true,
  baseState: false
};

@Injectable({
  providedIn: 'root'
})
/** Service managing the Plotly-based section visualization, including data fetching, plot options, and camera state. */
export class PlotService {
  isFreePositioningMode = signal<boolean>(false);
  temporaryLoadData: ChargeData | null = null;
  error = signal<TaskError | DataError | null>(null);
  pythonErrorCode = signal<PythonErrorCode | null>(null);

  readonly axesNorms = signal<AxesNorms>({
    x: 1,
    y: 1,
    z: 1,
    aspectMode: 'data'
  });

  litData = signal<GetSectionOutput | null>(null);
  baseLitData = signal<GetSectionOutput | null>(null);
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);
  camera = signal<Camera | null>(null);

  isStudioActive = signal<boolean>(false);
  study = signal<Study | null>(null);
  section = signal<Section | null>(null);
  spanAmountChoice = signal<'single' | 'double' | 'all'>('all');

  plotOptions = signal<PlotOptions>({
    ...defaultPlotOptions
  });
  selectedDisplayOptions = signal<SelectedDisplayOptions>({
    ...defaultSelectedDisplayOptions
  });

  private readonly resolutionService = inject(PlotResolutionService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly cableService = inject(CablesService);
  private readonly sectionService = inject(SectionService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly logger = inject(LoggerService);
  private readonly obstacleStateService = inject(ObstacleStateService);

  // Facade re-delegations — same signal references as PlotResolutionService
  readonly resolution = this.resolutionService.resolution;
  readonly appliedResolution = this.resolutionService.appliedResolution;
  readonly defaultResolution = this.resolutionService.defaultResolution;

  constructor() {
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      if (this.isStudioActive() && this.workerReady() && this.section()) {
        this.refreshSection(this.section()!);
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
    this.isFreePositioningMode.set(false);
    this.plotOptions.set({
      ...defaultPlotOptions
    });
    this.camera.set(null);
    this.isStudioActive.set(false);
    this.section.set(null);
    this.study.set(null);
    this.spanAmountChoice.set('all');
    this.axesNorms.set({ x: 1, y: 1, z: 1, aspectMode: 'data' });
    this.obstacleStateService.reset();
    this.obstaclesService.setSelectedObstacle(null, null);
    this.sideTabsService.sideTabs.set(null);
  };

  modifySection = (sectionData: Partial<Section>) => {
    const study = this.study();
    const section = this.section();
    if (!study || !section) {
      return;
    }
    return this.sectionService.createOrUpdateSection(study, {
      ...section,
      ...sectionData
    });
  };

  plotOptionsChange(values: Partial<PlotOptions>) {
    const oldOptions = untracked(() => this.plotOptions());
    const newOptions = { ...oldOptions, ...values };
    this.plotOptions.set(newOptions);
    if ('startSupport' in values || 'endSupport' in values) {
      const diff = Math.abs(newOptions.endSupport - newOptions.startSupport);
      if (diff === 1) {
        this.spanAmountChoice.set('single');
      } else if (diff === 2) {
        this.spanAmountChoice.set('double');
      } else {
        this.spanAmountChoice.set('all');
      }
    }
    this.refreshCamera();
    if (
      checkIfProjectionNeedRefresh(
        oldOptions,
        newOptions,
        untracked(() => this.loading())
      )
    ) {
      this.refreshProjection();
    }
  }

  refreshSection = async (section: Section) => {
    this.error.set(null);
    this.pythonErrorCode.set(null);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.section.set(section);
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
        untracked(() => this.plotOptions())
      );
      this.litData.set({ ...sectionLitData, obstacles: syncedOutput?.obstacles ?? [] });
    } else {
      this.obstacleStateService.reset();
      this.litData.set(sectionLitData);
    }
    this.loading.set(false);
  };

  getCamera = () => {
    const plot = document.getElementById(PLOT_ID);
    if (!plot) {
      return null;
    }
    return (plot as HTMLElement & { _fullLayout?: { scene?: { camera?: Camera } } })._fullLayout?.scene?.camera ?? null;
  };

  refreshCamera = (): Camera | null => {
    const camera = this.getCamera();
    if (
      !isEqual(
        camera,
        untracked(() => this.camera())
      )
    ) {
      this.camera.set(camera);
    }
    return camera;
  };

  refreshProjection = async () => {
    this.loading.set(true);
    const { result, error, pythonErrorCode } = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: this.plotOptions().startSupport,
      endSupport: this.plotOptions().endSupport,
      view: this.plotOptions().view
    });
    this.litData.set(result?.sectionOutput?.current ?? null);
    this.baseLitData.set(result?.sectionOutput?.base ?? null);
    this.obstacleStateService.setDistances(result?.distances ?? []);
    this.error.set(error);
    this.pythonErrorCode.set(pythonErrorCode ?? null);
    this.loading.set(false);
  };

  purgePlot = () => {
    if (!document.getElementById(PLOT_ID)) {
      return;
    }
    plotly.purge(PLOT_ID);
    this.litData.set(null);
    this.baseLitData.set(null);
    this.error.set(null);
    this.pythonErrorCode.set(null);
    this.loading.set(false);
  };

  public setAxesNorms(norms: AxesNorms): void {
    this.axesNorms.set(norms);
  }

  setResolution(value: number): void {
    this.resolutionService.setResolution(value);
  }

  async applyResolution(value: number): Promise<void> {
    return this.resolutionService.applyResolution(value);
  }

  /**
   * Helper to compute the number of spans from supports count.
   * A span exists between each adjacent pair of supports, so N supports = N-1 spans.
   * @param supports Array of supports
   * @returns Number of spans (always >= 0)
   */
  private getSpanCount(supports: Section['supports']): number {
    return Math.max(supports.length - 1, 0);
  }

  getSpanOptions = computed<SpanOption[]>(() => {
    const supports = this.section()?.supports ?? [];
    const spanCount = this.getSpanCount(supports);

    return Array.from({ length: spanCount }, (_, index) => ({
      label: `${formatSupportNumber(supports[index].number)} - ${formatSupportNumber(supports[index + 1].number)}`,
      value: supports[index]?.uuid ?? null
    }));
  });

  /**
   * Get span options with both index and UUID for components that need the span index.
   * @returns Array of span options with value as {index, uuid} objects
   */
  getSpanOptionsWithIndex = computed<{ label: string; value: { index: number; uuid: string } | null }[]>(() => {
    const supports = this.section()?.supports ?? [];
    const spanCount = this.getSpanCount(supports);

    return Array.from({ length: spanCount }, (_, index) => ({
      label: `${formatSupportNumber(supports[index].number)} - ${formatSupportNumber(supports[index + 1].number)}`,
      value: supports[index]?.uuid && supports[index].uuid !== '' ? { index, uuid: supports[index].uuid } : null
    }));
  });

  getSupportIndex = (supportUuid: string): number => {
    return this.section()?.supports?.findIndex((s) => s.uuid === supportUuid) ?? -1;
  };
  getSupportOptions = (supportUuid: string | null): { label: string; value: 'LEFT' | 'RIGHT' }[] => {
    const supports = this.section()?.supports;
    if (supportUuid === null || !supports) {
      return [];
    }
    const spanIndex = supports.findIndex((s) => s.uuid === supportUuid);
    if (spanIndex >= 0 && spanIndex + 1 < supports.length) {
      return [
        {
          label: formatSupportNumber(supports[spanIndex].number),
          value: 'LEFT'
        },
        {
          label: formatSupportNumber(supports[spanIndex + 1].number),
          value: 'RIGHT'
        }
      ];
    }
    return [];
  };
}
