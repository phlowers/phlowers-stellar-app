import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FieldMeasure } from '../../types';

@Component({
  selector: 'app-header',
  imports: [
    DecimalPipe,
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  measureData = input.required<FieldMeasure>();
  fieldChange = output<{
    field: keyof FieldMeasure;
    value: FieldMeasure[keyof FieldMeasure];
  }>();

  readonly spans = computed<
    { label: string; value: number[]; supports: number[] }[]
  >(() => {
    const supportsLength =
      this.plotService.plotOptions().endSupport -
      this.plotService.plotOptions().startSupport +
      1;
    const spanAmount = Math.max(supportsLength - 1, 0);
    // create an array the length of spanAmount
    const spans = Array.from({ length: spanAmount }, (_, index) => ({
      label: `${index + 1} - ${index + 2}`,
      value: [index, index + 1],
      supports: [index, index + 1]
    }));
    return spans;
  });

  selectedSpan = signal<number[] | null>(null);

  private hasCalculatedInitialAltitude = false;

  constructor(private readonly plotService: PlotService) {
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
      if (!Array.isArray(span) || span.length !== 2) {
        return;
      }

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
    const section = this.plotService.section();
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
    const midValue =
      (leftSupport.attachmentHeight + rightSupport.attachmentHeight) / 2;

    // Only update if the altitude has actually changed to prevent infinite loops
    const currentAltitude = untracked(() => this.measureData().altitude);
    if (currentAltitude !== midValue) {
      this.onFieldChange('altitude', midValue);
    }
  }

  onFieldChange(
    field: keyof FieldMeasure,
    value: FieldMeasure[keyof FieldMeasure]
  ): void {
    this.fieldChange.emit({ field, value });
  }
}
