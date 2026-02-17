import { computed, effect, Injectable, signal, untracked } from '@angular/core';
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
import { ChargeData } from '@src/app/core/domain/models/charge.model';

export const PLOT_ID = 'plotly-output';

export interface SpanOption {
  label: string;
  value: {
    index: number;
    uuid: string;
  };
}

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

export const defaultPlotOptions: PlotOptions = {
  view: '3d',
  side: 'profile',
  startSupport: 0,
  endSupport: 1,
  invert: false
};

const DEFAULT_RESOLUTION = 100;
const RESOLUTION_STORAGE_KEY = 'plotResolution';

const defaultSelectedDisplayOptions: SelectedDisplayOptions = {
  loads: true,
  baseState: false
};

export interface SelectedDisplayOptions {
  loads: boolean;
  baseState: boolean;
}

@Injectable({
  providedIn: 'root'
})
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
  plotOptions = signal<PlotOptions>({
    ...defaultPlotOptions
  });
  resolution = signal<number>(DEFAULT_RESOLUTION);
  appliedResolution = signal<number | null>(null);
  selectedDisplayOptions = signal<SelectedDisplayOptions>({
    ...defaultSelectedDisplayOptions
  });
  isSidebarOpen = signal(false);

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    private readonly cableService: CablesService,
    private readonly sectionService: SectionService
  ) {
    const storedResolution = Number(localStorage.getItem(RESOLUTION_STORAGE_KEY));
    if (Number.isFinite(storedResolution) && storedResolution > 0) {
      this.resolution.set(storedResolution);
    }
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
    effect(() => {
      if (this.isStudioActive() && this.workerReady() && this.section()) {
        this.refreshSection(this.section()!);
      }
    });
    effect(() => {
      if (this.workerReady()) {
        this.applyResolution(this.resolution());
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
  };

  private normalizeResolution(value: number): number {
    if (!Number.isFinite(value)) {
      return DEFAULT_RESOLUTION;
    }
    return Math.max(1, Math.round(value));
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

  setResolution(value: number): void {
    const normalizedResolution = this.normalizeResolution(value);
    if (normalizedResolution === this.resolution()) {
      return;
    }
    this.resolution.set(normalizedResolution);
    localStorage.setItem(RESOLUTION_STORAGE_KEY, normalizedResolution.toString());
  }

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
    return (plot as any)._fullLayout?.scene?.camera;
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

  setSidebarOpen = () => {
    this.refreshCamera();
    this.isSidebarOpen.set(!this.isSidebarOpen());
  };

  getSpanOptions = computed<SpanOption[]>(() => {
    const supports = this.section()?.supports ?? [];
    const supportsAmount = supports.length ?? 0;
    const spanAmount = Math.max(supportsAmount - 1, 0);
    // create an array the length of spanAmount
    const spans = Array.from({ length: spanAmount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: {
        index: index,
        uuid: supports[index]?.uuid ?? ''
      }
    }));
    return spans;
  });

  getSupportOptions = (selectedSpan: SpanOption['value'] | null): { label: number; value: 'LEFT' | 'RIGHT' }[] => {
    if (selectedSpan === null) {
      return [];
    }
    const spanIndex = selectedSpan.index;
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
  };
}
