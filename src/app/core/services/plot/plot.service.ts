import { computed, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { AxesNorms, PlotOptions, PLOT_ID, SelectedDisplayOptions, SpanOption } from '@shared/types/plot.types';
import {
  DataError,
  Distance,
  GetSectionOutput,
  PythonErrorCode,
  Task,
  TaskError
} from '@services/worker_python/tasks/types';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { Section, Study } from '@shared/domain';
import { Subscription } from 'rxjs';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { CablesService } from '@shared/catalog/services/cables.service';
import * as plotly from 'plotly.js-dist-min';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';
import { SectionService } from '@services/section/section.service';
import { ChargeData } from '@shared/domain/models/charge.model';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { LoggerService } from '@core/services/logger/logger.service';

const MIN_RESOLUTION = 25;
const RESOLUTION_STORAGE_KEY = 'plotResolution';

/**
 * Checks whether a projection refresh is needed based on changed plot options.
 * @param oldOptions - Previous plot options
 * @param newOptions - New plot options
 * @param loading - Whether a calculation is currently in progress
 * @returns `true` if the projection should be refreshed
 */
export const checkIfProjectionNeedRefresh = (oldOptions: PlotOptions, newOptions: PlotOptions, loading: boolean) => {
  if (loading) {
    return false;
  }
  const oldView = oldOptions.view;
  const newView = newOptions.view;
  const oldSide = oldOptions.side;
  const newSide = newOptions.side;
  if (oldView !== newView || oldSide !== newSide) {
    return true;
  }
  if (newView !== '2d') {
    return false;
  }
  const oldStartSupport = oldOptions.startSupport;
  const oldEndSupport = oldOptions.endSupport;
  const newStartSupport = newOptions.startSupport;
  const newEndSupport = newOptions.endSupport;
  if (oldStartSupport !== newStartSupport || oldEndSupport !== newEndSupport) {
    return true;
  }
  return false;
};

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

  resolution = signal<number>(100);
  appliedResolution = signal<number | null>(null);
  /** Default resolution value loaded from Python engine configuration. Also used as maximum for the UI slider. */
  defaultResolution = signal<number>(100);
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
  distances = signal<Distance[]>([]);
  distanceType = signal<'oblique' | 'vertical' | 'horizontal' | null>(null);

  plotOptions = signal<PlotOptions>({
    ...defaultPlotOptions
  });
  selectedDisplayOptions = signal<SelectedDisplayOptions>({
    ...defaultSelectedDisplayOptions
  });

  private readonly injector = inject(Injector);

  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly cableService = inject(CablesService);
  private readonly sectionService = inject(SectionService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly logger = inject(LoggerService);

  constructor() {
    const storedResolution = Number(localStorage.getItem(RESOLUTION_STORAGE_KEY));
    if (Number.isFinite(storedResolution) && storedResolution >= MIN_RESOLUTION) {
      // Clamp to minimum; will be re-clamped to max once worker loads config
      this.resolution.set(storedResolution);
    }

    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      if (this.workerReady()) {
        this.workerPythonService.runTask(Task.getConfig, undefined).then(({ result }) => {
          if (result?.resolution) {
            // Update default resolution from Python config
            this.defaultResolution.set(result.resolution);
            // Re-clamp current resolution if it exceeds the loaded value
            const currentResolution = this.resolution();
            if (currentResolution > result.resolution) {
              this.setResolution(result.resolution);
            }
          }
        });
      }
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
    this.distances.set([]);
    this.distanceType.set(null);
    this.injector.get(ObstacleFormService).clearPositions();
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
    let currentLitData: GetSectionOutput | null = result?.current ?? null;
    this.baseLitData.set(result?.base ?? null);
    this.error.set(error);
    this.pythonErrorCode.set(pythonErrorCode ?? null);

    if (error) {
      this.distances.set([]);
      this.distanceType.set(null);
    } else {
      currentLitData = await this.applyTemporaryLoad(currentLitData);
      currentLitData = await this.applySectionObstacles(section, currentLitData);
    }

    this.litData.set(currentLitData);
    this.loading.set(false);
  };

  /**
   * Applies the active load case (temporaryLoadData) on top of the given lit data.
   * If no load data is active, or if currentLitData is null, returns the input unchanged.
   * @param currentLitData - The current section output to apply the load onto (may be null)
   * @returns Updated section output with the load state applied, or the original if nothing to apply
   */
  private async applyTemporaryLoad(currentLitData: GetSectionOutput | null): Promise<GetSectionOutput | null> {
    if (!this.temporaryLoadData || !currentLitData) {
      return currentLitData;
    }
    const { result: loadResult } = await this.workerPythonService.runTask(Task.changeState, {
      climate: this.temporaryLoadData.climate,
      spanLoads: this.temporaryLoadData.spanLoads
    });
    if (loadResult?.current) {
      this.baseLitData.set(loadResult.base ?? null);
      return loadResult.current;
    }
    return currentLitData;
  }

  /**
   * Re-adds all obstacles from the section and refreshes the distances signal.
   * If the section has no obstacles, resets the distances to an empty array.
   * @param section - The section whose obstacles should be applied
   * @param currentLitData - The current section output to layer obstacles onto (may be null)
   * @returns Updated section output after obstacle application, or the original value if no obstacles
   */
  private async applySectionObstacles(
    section: Section,
    currentLitData: GetSectionOutput | null
  ): Promise<GetSectionOutput | null> {
    if (!section.obstacles?.length) {
      this.distances.set([]);
      return currentLitData;
    }
    if (!currentLitData) {
      return currentLitData;
    }
    // Re-add obstacles from the section so that annotations and distance traces are preserved
    // across section reloads (e.g. re-opening the study or after a save).
    for (const obstacle of section.obstacles) {
      const { result: obstacleResult } = await this.workerPythonService.runTask(Task.addObstacle, obstacle);
      if (obstacleResult?.current) {
        currentLitData = obstacleResult.current;
      }
    }
    const options = untracked(() => this.plotOptions());
    const { result: distances } = await this.workerPythonService.runTask(Task.calculateObstaclesDistances, {
      startSupport: options.startSupport,
      endSupport: options.endSupport,
      view: options.view
    });
    this.distances.set(distances ?? []);
    return currentLitData;
  }

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

  private normalizeResolution(value: number): number {
    if (!Number.isFinite(value)) {
      return this.defaultResolution();
    }
    const rounded = Math.round(value);
    const max = this.defaultResolution();
    return Math.max(MIN_RESOLUTION, Math.min(max, rounded));
  }

  setResolution(value: number): void {
    const normalizedResolution = this.normalizeResolution(value);
    if (normalizedResolution === this.resolution()) {
      return;
    }
    this.resolution.set(normalizedResolution);
    localStorage.setItem(RESOLUTION_STORAGE_KEY, normalizedResolution.toString());
  }

  async applyResolution(value: number): Promise<void> {
    if (!this.workerPythonService.ready) {
      return;
    }
    const normalizedResolution = this.normalizeResolution(value);
    if (this.appliedResolution() === normalizedResolution) {
      return;
    }
    const { error } = await this.workerPythonService.runTask(Task.setResolution, {
      resolution: normalizedResolution
    });
    if (!error) {
      this.appliedResolution.set(normalizedResolution);
    }
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

  /**
   * Re-applies all obstacles from the current section, starting from the correct base state.
   *
   * If a load state is active (temporaryLoadData is set), first restores that state via
   * Task.changeState before adding obstacles, so that obstacles are always layered on top
   * of the correct base. Then iterates over each obstacle, calls Task.addObstacle for each,
   * and if any obstacles exist, calls Task.calculateObstaclesDistances to refresh the
   * distances signal. Updates litData and distances signals on completion.
   */
  async reapplyObstacles(): Promise<void> {
    const section = untracked(() => this.section());
    const obstacles = section?.obstacles ?? [];
    const plotOptions = untracked(() => this.plotOptions());

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

    for (const obstacle of obstacles) {
      const { result: obstacleResult } = await this.workerPythonService.runTask(Task.addObstacle, obstacle);
      if (obstacleResult?.current) {
        currentLitData = obstacleResult.current;
      }
    }

    if (obstacles.length) {
      const { result: distances } = await this.workerPythonService.runTask(Task.calculateObstaclesDistances, {
        startSupport: plotOptions.startSupport,
        endSupport: plotOptions.endSupport,
        view: plotOptions.view
      });
      this.distances.set(distances ?? []);
    }

    this.litData.set(currentLitData);
  }

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
