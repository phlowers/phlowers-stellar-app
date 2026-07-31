import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnDestroy } from '@angular/core';
import { SectionPlotComponent } from './section/section-plot.component';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { PlotService } from '@services/plot/plot.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { formatStudioError } from './helpers/errors';
import { formatPythonError } from '@core/services/worker_python/tasks/python-error-messages';

@Component({
  selector: 'app-studio',
  templateUrl: './studio.component.html',
  imports: [SectionPlotComponent, ProgressSpinnerModule, TranslocoModule],
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
  private readonly translocoService = inject(TranslocoService);

  // State
  /**
   * Whether the current section's plot data is available. Derived directly from
   * litData (rather than latched) so it correctly resets on every new section load —
   * litData is nulled synchronously by initSectionStudio, but refreshProjection does not
   * clear it before recomputing (support-range panning), so this stays true across pans
   * and only drops while a genuinely new section is loading.
   */
  readonly plotInitialized = computed(() => this.plotService.litData() !== null);

  constructor() {
    effect(() => {
      const error = this.plotService.error();
      const diagnostics = this.plotService.diagnostics();
      const exceptionDiagnostic = diagnostics.find((diagnostic) => diagnostic.origin === 'exception') ?? null;

      if (error !== null) {
        const message = formatStudioError(error, this.translocoService, exceptionDiagnostic?.code ?? null);
        if (exceptionDiagnostic?.severity === 'warning') {
          this.notificationService.warning(message);
        } else {
          this.notificationService.error(message);
        }
      }

      for (const diagnostic of diagnostics) {
        if (diagnostic.origin === 'warning') {
          const message = formatPythonError(diagnostic.code, this.translocoService);
          if (message !== null) {
            this.notificationService.warning(message);
          }
        }
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
