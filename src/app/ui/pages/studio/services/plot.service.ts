import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  signal
} from '@angular/core';
import { Study } from '@core/data/database/interfaces/study';
import { PlotOptions } from '@src/app/ui/shared/components/studio/section/helpers/types';
import {
  DataError,
  GetSectionOutput,
  Task,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';
import { Section } from '@core/data/database/interfaces/section';
import { Subscription } from 'rxjs';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { CablesService } from '@src/app/core/services/cables/cables.service';
import * as plotly from 'plotly.js-dist-min';
import { Camera } from 'plotly.js-dist-min';
import { isEqual } from 'lodash';

export const PLOT_ID = 'plotly-output';

export interface SpanOption {
  label: string;
  value: number[];
  supports: number[];
}

export const checkIfProjectionNeedRefresh = (
  oldOptions: PlotOptions,
  newOptions: PlotOptions,
  loading: boolean
) => {
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

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  error = signal<TaskError | DataError | null>(null);
  litData = signal<GetSectionOutput | null>(null);
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);
  destroyRef = inject(DestroyRef);
  camera = signal<Camera | null>(null);

  study = signal<Study | null>(null);
  section = signal<Section | null>(null);
  plotOptions = signal<PlotOptions>({
    ...defaultPlotOptions
  });
  isSidebarOpen = signal(false);

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    private readonly cableService: CablesService
  ) {}

  resetAll = () => {
    this.purgePlot();
    this.error.set(null);
    this.litData.set(null);
    this.loading.set(false);
    this.plotOptions.set({
      ...defaultPlotOptions
    });
    this.camera.set(null);
    this.section.set(null);
    this.study.set(null);
  };

  plotOptionsChange(values: Partial<PlotOptions>) {
    const oldOptions = this.plotOptions();
    const newOptions = { ...oldOptions, ...values };
    this.plotOptions.set(newOptions);
    this.refreshCamera();
    if (checkIfProjectionNeedRefresh(oldOptions, newOptions, this.loading())) {
      this.refreshProjection();
    }
  }

  calculateCharge = async (
    windPressure: number,
    cableTemperature: number,
    iceThickness: number
  ) => {
    this.refreshCamera();
    this.loading.set(true);
    const { result, error } = await this.workerPythonService.runTask(
      Task.changeClimateLoad,
      {
        windPressure,
        cableTemperature,
        iceThickness
      }
    );
    this.litData.set(result);
    this.error.set(error);
    this.loading.set(false);
  };

  refreshSection = async (section: Section) => {
    this.error.set(null);
    this.litData.set(null);
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
    const { result, error } = await this.workerPythonService.runTask(
      Task.getLit,
      { section, cable }
    );
    this.plotOptions.set({
      ...this.plotOptions(),
      startSupport: 0,
      endSupport: section.supports.length - 1,
      invert: false
    });
    this.litData.set(result);
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
    if (!isEqual(camera, this.camera())) {
      this.camera.set(camera);
    }
    return camera;
  };

  refreshProjection = async () => {
    this.loading.set(true);
    const { result, error } = await this.workerPythonService.runTask(
      Task.refreshProjection,
      {
        startSupport: this.plotOptions().startSupport,
        endSupport: this.plotOptions().endSupport,
        view: this.plotOptions().view
      }
    );
    this.litData.set(result);
    this.error.set(error);
    this.loading.set(false);
  };

  purgePlot = () => {
    if (!document.getElementById(PLOT_ID)) {
      return;
    }
    plotly.purge(PLOT_ID);
    this.litData.set(null);
    this.error.set(null);
    this.loading.set(false);
  };

  setSidebarOpen = () => {
    this.refreshCamera();
    this.isSidebarOpen.set(!this.isSidebarOpen());
  };

  getSpanOptions = computed<SpanOption[]>(() => {
    const supportsLength =
      this.plotOptions().endSupport - this.plotOptions().startSupport + 1;
    const spanAmount = Math.max(supportsLength - 1, 0);
    // create an array the length of spanAmount
    const spans = Array.from({ length: spanAmount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: [index, index + 1],
      supports: [index, index + 1]
    }));
    return spans;
  });
}
