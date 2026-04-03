import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PlotService } from '@services/plot/plot.service';
import { NotificationService } from '@core/services/notification/notification.service';
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
export class StudioComponent implements OnDestroy {
  // Inputs
  /** Whether this studio instance is used in preview mode. */
  readonly isPreview = input.required<boolean>();

  // Services
  protected readonly plotService = inject(PlotService);
  private readonly notificationService = inject(NotificationService);

  constructor() {
    effect(() => {
      const error = this.plotService.error();
      if (error !== null) {
        this.notificationService.error(formatStudioError(error));
      }
    });

    effect(() => {
      const section = this.plotService.section();
      const workerReady = this.plotService.workerReady();
      const isPreview = this.isPreview();

      if (workerReady && section && isPreview) {
        this.plotService.refreshSection(section);
      }
    });
  }

  ngOnDestroy(): void {
    this.plotService.error.set(null);
  }
}
