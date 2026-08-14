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
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { TranslocoModule } from '@jsverse/transloco';

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
    const supports = this.spanService.section()?.supports ?? [];
    const spanAmount = Math.max(supports.length - 1, 0);
    return Array.from({ length: spanAmount }, (_, index) => {
      const leftNum = supports[index]?.number;
      const rightNum = supports[index + 1]?.number;
      const left = leftNum ? formatSupportNumber(leftNum) : String(index + 1);
      const right = rightNum ? formatSupportNumber(rightNum) : String(index + 2);
      return {
        label: `${left} - ${right}`,
        value: [index, index + 1],
        supports: [index, index + 1]
      };
    });
  });

  selectedSpan = signal<number[] | null>(null);

  private hasCalculatedInitialAltitude = false;
  private readonly previousSpan = signal<number[] | null>(null);

  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);

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

  onFieldChange(field: keyof FieldMeasure, value: FieldMeasure[keyof FieldMeasure]): void {
    this.fieldChange.emit({ field, value });
  }
}
