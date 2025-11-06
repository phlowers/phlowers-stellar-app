import { Injectable, signal } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class PlotService {
  error = signal<TaskError | DataError | null>(null);
  litData = signal<GetSectionOutput | null>(null);
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);

  study = signal<Study | null>(null);
  section = signal<Section | null>(null);
  plotOptions = signal<PlotOptions>({
    view: '3d',
    side: 'profile',
    startSupport: 0,
    endSupport: 1,
    invert: false
  });
  isSidebarOpen = signal(false);

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    private readonly cableService: CablesService
  ) {}

  plotOptionsChange(
    key: keyof PlotOptions,
    value: PlotOptions[keyof PlotOptions]
  ) {
    this.plotOptions.set({ ...this.plotOptions(), [key]: value });
  }

  calculateCharge = async (
    windPressure: number,
    cableTemperature: number,
    iceThickness: number
  ) => {
    this.loading.set(true);
    const { result, error } = await this.workerPythonService.runTask(
      Task.runEngine,
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

  purgePlot = () => {
    if (!document.getElementById('plotly-output')) {
      return;
    }
    plotly.purge('plotly-output');
    this.litData.set(null);
    this.error.set(null);
    this.loading.set(false);
  };
}
