import { Component, computed, effect, inject, input } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PlotService } from '@ui/pages/studio/services/plot.service';
import { formatStudioError } from './helpers/errors';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule]
})
export class StudioComponent {
  // Inputs
  readonly isPreview = input.required<boolean>();

  // Services
  protected readonly plotService = inject(PlotService);

  // Computed
  readonly errorString = computed(() => formatStudioError(this.plotService.error()));

  // Effects
  private readonly previewRefreshEffect = effect(() => {
    const section = this.plotService.section();
    const workerReady = this.plotService.workerReady();
    const isPreview = this.isPreview();

    if (workerReady && section && isPreview) {
      this.plotService.refreshSection(section);
    }
  });
}
