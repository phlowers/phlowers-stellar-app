import { computed, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { PlotOptions } from '@shared/types/plot.types';
import { DataError, GetSectionOutput, Task, TaskError } from '@services/worker_python/tasks/types';
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

/** DOM element ID used for the Plotly chart container. */
export const PLOT_ID = 'plotly-output';

const MIN_RESOLUTION = 25;
const RESOLUTION_STORAGE_KEY = 'plotResolution';

/** Option for a span dropdown selector. */
export interface SpanOption {
  /** Display label for the span option. */
  label: string;
  /** UUID value of the span, or null if not applicable. */
  value: string | null;
}

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
export const defaultPlotOptions: PlotOptions = {
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

/** Options controlling which overlays are visible on the plot. */
export interface SelectedDisplayOptions {
  /** Whether load results are displayed. */
  loads: boolean;
  /** Whether base state results are displayed. */
  baseState: boolean;
}

@Injectable({
  providedIn: 'root'
})
/** Service managing the Plotly-based section visualization, including data fetching, plot options, and camera state. */
export class PlotService {
  isFreePositioningMode = signal<boolean>(false);
  temporaryLoadData: ChargeData | null = null;
  error = signal<TaskError | DataError | null>(null);

  readonly axesNorms = signal<{ x: number; y: number; z: number; aspectMode: string }>({
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
          if (result && result.resolution) {
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
    this.injector.get(ObstacleFormService).clearPositions();
    this.obstaclesService.resetCurrentPointIndex();
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
    this.litData.set(null);
    this.baseLitData.set(null);
    this.section.set(section);
    if (!this.workerPythonService.ready || !section?.cable_name) {
      console.error('refreshSection error');
      this.error.set(DataError.NO_CABLE_FOUND);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    const cable = await this.cableService.getCable(section.cable_name);
    if (!cable) {
      console.error('no cable found: ', section.cable_name);
      this.loading.set(false);
      this.error.set(DataError.NO_CABLE_FOUND);
      return;
    }
    const { result, error } = await this.workerPythonService.runTask(Task.getLit, { section, cable });
    this.litData.set(result?.current ?? null);
    this.baseLitData.set(result?.base ?? null);
    this.error.set(error);
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
    const { result, error } = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: this.plotOptions().startSupport,
      endSupport: this.plotOptions().endSupport,
      view: this.plotOptions().view
    });
    this.litData.set(result?.current ?? null);
    this.baseLitData.set(result?.base ?? null);
    this.error.set(error);
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
    this.loading.set(false);
  };

  public setAxesNorms(norms: { x: number; y: number; z: number; aspectMode: string }): void {
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
      label: `${index + 1} - ${index + 2}`,
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
      label: `${index + 1} - ${index + 2}`,
      value: supports[index]?.uuid && supports[index].uuid !== '' ? { index, uuid: supports[index].uuid } : null
    }));
  });

  getSupportIndex = (supportUuid: string): number => {
    return this.section()?.supports?.findIndex((s) => s.uuid === supportUuid) ?? -1;
  };

  getSupportOptions = (supportUuid: string | null): { label: number; value: 'LEFT' | 'RIGHT' }[] => {
    if (supportUuid === null) {
      return [];
    }
    const spanIndex = this.section()?.supports?.findIndex((s) => s.uuid === supportUuid);
    if (spanIndex !== undefined && spanIndex >= 0) {
      return [
        {
          label: spanIndex + 1,
          value: 'LEFT'
        },
        {
          label: spanIndex + 2,
          value: 'RIGHT'
        }
      ];
    }
    return [];
  };
}
