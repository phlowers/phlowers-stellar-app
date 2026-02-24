import { computed, effect, inject, Injectable, Injector, signal, untracked } from '@angular/core';
import { PlotOptions } from '@ui/shared/components/studio/section/helpers/types';
import { DataError, GetSectionOutput, Task, TaskError } from '@services/worker_python/tasks/types';
import { Section, Study } from '@core/domain';
import { Subscription } from 'rxjs';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { CablesService } from '@services/cables/cables.service';
import * as plotly from 'plotly.js-dist-min';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';
import { SectionService } from '@services/sections/section.service';
import { ChargeData } from '@core/domain/models/charge.model';
import { SideTabsService } from '../side-tabs/side-tabs.service';
import { ObstaclesService } from '../obstacles/obstacles.service';
import { ObstacleFormService } from '../obstacles/obstaclesForm/obstaclesForm.service';

/** DOM element ID used for the Plotly chart container. */
export const PLOT_ID = 'plotly-output';

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
  temporaryLoadData: ChargeData | null = null;
  error = signal<TaskError | DataError | null>(null);
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

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    private readonly cableService: CablesService,
    private readonly sectionService: SectionService,
    private readonly sideTabsService: SideTabsService,
    private readonly obstaclesService: ObstaclesService
  ) {
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
    this.litData.set(null);
    this.baseLitData.set(null);
    this.loading.set(false);
    this.plotOptions.set({
      ...defaultPlotOptions
    });
    this.camera.set(null);
    this.isStudioActive.set(false);
    this.section.set(null);
    this.study.set(null);
    this.spanAmountChoice.set('all');
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
    if (!this.workerPythonService.ready || !section || !section.cable_name) {
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

  getSpanOptions = computed<SpanOption[]>(() => {
    const supports = this.section()?.supports ?? [];
    const supportRealNumberLength = supports.length + 1;
    const supportsAmount = supportRealNumberLength ?? 0;
    const spanAmount = Math.max(supportsAmount - 1, 0);
    const spans = Array.from({ length: spanAmount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: supports[index]?.uuid ?? null
    }));
    spans.pop();
    return spans;
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
