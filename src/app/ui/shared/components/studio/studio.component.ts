import {
  Component,
  computed,
  effect,
  input,
  OnDestroy,
  signal
} from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import {
  DataError,
  TaskError
} from '@src/app/core/services/worker_python/tasks/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { Section } from '@core/data/database/interfaces/section';
import { OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule]
})
export class StudioComponent implements OnInit, OnDestroy {
  section = input.required<Section | null>();
  isSupportZoom = input.required<boolean>();
  subscription: Subscription | null = null;
  workerReady = signal<boolean>(false);

  getErrorString = computed(() => {
    switch (this.plotService.error()) {
      case DataError.NO_CABLE_FOUND:
        return $localize`No cable found`;
      case TaskError.CALCULATION_ERROR:
        return $localize`Calculation error`;
      case TaskError.SOLVER_DID_NOT_CONVERGE:
        return $localize`Calculation error: 'Solver did not converge'`;
      case TaskError.PYODIDE_LOAD_ERROR:
        return $localize`Pyodide load error`;
      default:
        return $localize`Unknown error`;
    }
  });

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    public readonly plotService: PlotService
  ) {
    effect(() => {
      if (this.workerReady() && this.section()) {
        this.plotService.refreshSection(this.section()!);
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
    this.plotService.purgePlot();
    this.plotService.camera.set(null);
  }
}
