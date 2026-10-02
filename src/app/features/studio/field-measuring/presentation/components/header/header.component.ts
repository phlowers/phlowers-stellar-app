import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { isEqual } from 'lodash';
import { buildSectionLocalizationPayload, formatSpanLabel, getSpanLocalization } from '../../helpers';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { NotificationService } from '@services/notification/notification.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { LoggerService } from '@core/services/logger/logger.service';

@Component({
  selector: 'app-header',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    TranslocoModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Header component for field measuring, handling span selection and altitude computation. */
export class HeaderComponent {
  /** Current field measure data. */
  measureData = input.required<FieldMeasure>();
  /** Emits when a field value changes. */
  fieldChange = output<{
    field: keyof FieldMeasure;
    value: FieldMeasure[keyof FieldMeasure];
  }>();

  readonly spans = computed<{ label: string; value: number[]; supports: number[] }[]>(() => {
    const section = this.spanService.section();
    const supports = section?.supports ?? [];
    const spanAmount = Math.max(supports.length - 1, 0);
    return Array.from({ length: spanAmount }, (_, index) => ({
      label: formatSpanLabel(section, [index, index + 1]),
      value: [index, index + 1],
      supports: [index, index + 1]
    }));
  });

  selectedSpan = signal<number[] | null>(null);

  private hasCalculatedInitialAltitude = false;
  private readonly previousSpan = signal<number[] | null>(null);
  /** Measure and span/reference support the localization was last resolved for. */
  private localizationSource: { uuid: string; key: string } | null = null;

  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly workerReady = toSignal(this.workerPythonService.ready$, { initialValue: false });
  private readonly logger = inject(LoggerService);

  constructor() {
    // Initialize span to first available span if measureData has no span set,
    // and calculate altitude if span exists but altitude is null
    effect(() => {
      const spans = this.spans();
      const currentSpan = this.measureData().span;
      const currentAltitude = this.measureData().altitude;

      // If spans are available and no span is set in measureData, set the first one
      if (spans.length > 0 && !currentSpan) {
        this.onSpanChange(spans[0].value);
        return;
      }

      // If span exists but altitude is null, calculate altitude once (handles load from saved data)
      if (
        !this.hasCalculatedInitialAltitude &&
        currentSpan &&
        Array.isArray(currentSpan) &&
        currentSpan.length === 2 &&
        currentAltitude === null
      ) {
        this.hasCalculatedInitialAltitude = true;
        this.calculateAltitude(currentSpan);
      }
    });

    // Calculate altitude when measureData.span changes
    effect(() => {
      const span = this.measureData().span;
      if (!Array.isArray(span) || span.length !== 2 || isEqual(span, this.previousSpan())) {
        return;
      }
      this.previousSpan.set(span);
      // Only recalculate if the span actually changed (not just a re-render)
      // This prevents unnecessary recalculations
      this.calculateAltitude(span);
    });

    // Fill longitude/latitude/azimuth from the study when the span or reference support changes
    effect(() => {
      const { uuid, span, leftSupport, longitude, latitude, azimuth } = this.measureData();
      if (span?.length !== 2 || !this.workerReady()) {
        return;
      }
      const key = JSON.stringify([span, leftSupport]);
      const previous = this.localizationSource;
      if (previous?.uuid === uuid && previous.key === key) {
        return;
      }
      this.localizationSource = { uuid, key };
      // Keep the values of a loaded measure that already has a localization
      if (previous?.uuid !== uuid && [longitude, latitude, azimuth].some((value) => value !== null)) {
        return;
      }
      untracked(() => void this.fillLocalization(span, leftSupport));
    });
  }

  onSpanChange(span: number[]): void {
    // Emit field change for span
    this.onFieldChange('span', span);
    this.onFieldChange('leftSupport', null);

    // Calculate and update altitude
    this.calculateAltitude(span);
  }

  private calculateAltitude(span: number[]): void {
    const section = this.spanService.section();
    if (!section?.supports) {
      return;
    }

    const supports = section.supports;
    const [leftSupportIndex, rightSupportIndex] = span;

    const leftSupport = supports[leftSupportIndex];
    const rightSupport = supports[rightSupportIndex];

    if (
      !leftSupport ||
      !rightSupport ||
      leftSupport.attachmentHeight === null ||
      rightSupport.attachmentHeight === null
    ) {
      return;
    }

    // Calculate mid value
    const midValue = (leftSupport.attachmentHeight + rightSupport.attachmentHeight) / 2;

    // Only update if the altitude has actually changed to prevent infinite loops
    const currentAltitude = untracked(() => this.measureData().altitude);
    if (currentAltitude !== midValue) {
      this.onFieldChange('altitude', midValue);
    }
  }

  private async fillLocalization(span: number[], referenceSupport: string | null): Promise<void> {
    const source = this.localizationSource;
    const section = this.spanService.section();
    const payload = buildSectionLocalizationPayload(section);
    let localization: ReturnType<typeof getSpanLocalization> = null;
    if (payload) {
      try {
        const { result, error } = await this.workerPythonService.runTask(Task.computeLocalization, payload);
        if (result && !error) {
          localization = getSpanLocalization(result, section, span, referenceSupport);
        }
      } catch (error) {
        this.logger.error('Failed to compute the field measure localization', error);
      }
    }
    // Ignore a result made stale by a newer span/reference support selection
    if (source !== this.localizationSource) {
      return;
    }
    if (!localization) {
      this.notificationService.info(
        this.translocoService.translate('field-measuring.header.localization-not-available')
      );
      return;
    }
    this.onFieldChange('longitude', localization.longitude);
    this.onFieldChange('latitude', localization.latitude);
    this.onFieldChange('azimuth', localization.azimuth);
  }

  onFieldChange(field: keyof FieldMeasure, value: FieldMeasure[keyof FieldMeasure]): void {
    this.fieldChange.emit({ field, value });
  }
}
