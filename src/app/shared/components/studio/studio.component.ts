import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy, signal } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { PlotService } from '@services/plot/plot.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { formatStudioError } from './helpers/errors';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';

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
  private readonly spanService = inject(PlotSpanService);

  // State
  readonly plotInitialized = signal(false);

  constructor() {
    effect(() => {
      const error = this.plotService.error();
      const diagnostics = this.plotService.diagnostics();
      const exceptionDiagnostic = diagnostics.find((diagnostic) => diagnostic.origin === 'exception') ?? null;

      if (error !== null) {
        const message = formatStudioError(error, exceptionDiagnostic?.code ?? null);
        if (exceptionDiagnostic?.severity === 'warning') {
          this.notificationService.warning(message);
        } else {
          this.notificationService.error(message);
        }
      }

      for (const diagnostic of diagnostics) {
        if (diagnostic.origin === 'warning') {
          const message = formatPythonError(diagnostic.code);
          if (message !== null) {
            this.notificationService.warning(message);
          }
        }
      }
    });

    effect(() => {
      if (this.plotService.litData() !== null) {
        this.plotInitialized.set(true);
      }
    });

    effect(() => {
      const section = this.spanService.section();
      const workerReady = this.plotService.workerReady();
      const isPreview = this.isPreview();

      if (workerReady && section && isPreview) {
        this.plotService.initSectionStudio(section);
      }
    });
  }

  ngOnDestroy(): void {
    this.plotService.error.set(null);
    this.plotService.diagnostics.set([]);
  }
}
