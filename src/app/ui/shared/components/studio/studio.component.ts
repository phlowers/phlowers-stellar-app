import { Component, effect, input, OnDestroy, signal } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import {
  DataError,
  GetSectionOutput,
  Task,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Section } from '@core/data/database/interfaces/section';
import { OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CablesService } from '@core/services/cables/cables.service';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule]
})
export class StudioComponent implements OnInit, OnDestroy {
  litData = signal<GetSectionOutput | null>(null);
  section = input.required<Section | null>();
  isSupportZoom = input.required<boolean>();
  loading = signal<boolean>(true);
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);
  error = signal<TaskError | DataError | null>(null);

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    private readonly cableService: CablesService
  ) {
    effect(() => {
      if (this.workerReady() && this.section()) {
        this.refreshSection();
      }
    });
  }

  ngOnInit() {
    this.subscription = this.workerPythonService.ready$.subscribe((value) => {
      this.workerReady.set(value);
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  refreshSection = async () => {
    this.error.set(null);
    this.litData.set(null);
    const section = this.section();
    if (!this.workerPythonService.ready || !section || !section.cable_name) {
      console.error('refreshSection error');
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
    this.litData.set(result);
    this.error.set(error);
    this.loading.set(false);
  };
}
