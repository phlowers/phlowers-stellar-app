import { Component, computed, DestroyRef, inject, input } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { combineLatest } from 'rxjs';

import { PlotService } from '@ui/pages/studio/services/plot.service';
import { formatStudioError } from './helpers/errors';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule]
})
export class StudioComponent {
  isPreview = input.required<boolean>(); // preview mode in the manual section modal

  getErrorString = computed(() => {
    return formatStudioError(this.plotService.error());
  });

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    public readonly plotService: PlotService
  ) {
    combineLatest([
      this.workerPythonService.ready$,
      toObservable(this.plotService.section)
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([workerReady, section]) => {
        if (workerReady && section && this.isPreview()) {
          this.plotService.refreshSection(section!);
        }
      });
  }
}
