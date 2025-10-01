import { Component, input, signal } from '@angular/core';
import { Section2DComponent } from './section/section.component';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import {
  GetSectionOutput,
  Task
} from '@src/app/core/services/worker_python/tasks/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [Section2DComponent, ProgressSpinnerModule]
})
export class StudioComponent {
  litData = signal<GetSectionOutput | null>(null);
  isSupportZoom = input.required<boolean>();
  loading = signal<boolean>(true);
  constructor(
    private readonly workerPythonService: WorkerPythonService,
    public readonly plotService: PlotService
  ) {
    workerPythonService.ready$.subscribe(() => this.refreshStudio());
  }

  refreshStudio = () => {
    if (!this.workerPythonService.ready) {
      return;
    }
    this.loading.set(true);
    this.workerPythonService.runTask(Task.getLit).then((result) => {
      this.litData.set(result);
      this.loading.set(false);
    });
  };
}
