import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PlotService } from '@services/plot/plot.service';
import { formatStudioError } from './helpers/errors';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/**
 * Top-level studio component that orchestrates section plot rendering,
 * loading state, and error display.
 */
export class StudioComponent {
  // Inputs
  /** Whether this studio instance is used in preview mode. */
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
