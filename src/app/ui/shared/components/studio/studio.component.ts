import { Component, signal } from '@angular/core';
import { Section2DComponent } from './section/section.component';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import {
  GetSectionOutput,
  Task
} from '@src/app/core/services/worker_python/tasks/types';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [Section2DComponent, ProgressSpinnerModule]
})
export class StudioComponent {
  litData = signal<GetSectionOutput | null>(null);
  loading = signal<boolean>(true);
  constructor(private readonly workerPythonService: WorkerPythonService) {
    workerPythonService.ready$.subscribe((ready) => {
      if (ready) {
        this.workerPythonService.runTask(Task.getLit).then((result) => {
          this.litData.set(result);
          this.loading.set(false);
        });
      }
    });
  }
}
