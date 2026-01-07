import {
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FieldMeasure } from '../../types';
import { SelectOption } from '../../constants';

@Component({
  selector: 'app-header',
  imports: [
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
  spanOptions = input.required<SelectOption[]>();
  fieldChange = output<{
    field: keyof FieldMeasure;
    value: FieldMeasure[keyof FieldMeasure];
  }>();

  readonly spans = computed<{ label: string; supports: number[] }[]>(() => {
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

  constructor(private readonly plotService: PlotService) {
    // Initialize selectedSpan with the first span when spans are available
    effect(() => {
      const spans = this.spans();
      if (spans.length > 0 && this.selectedSpan() === null) {
        this.selectedSpan.set(spans[0].supports);
      }
    });

    // Update altitude field with attachment height mid value when selected span changes
    effect(() => {
      const span = this.selectedSpan();
      if (span?.length !== 2) {
        return;
      }

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

      // Calculate mid value and round to 2 decimals
      const midValue =
        (leftSupport.attachmentHeight + rightSupport.attachmentHeight) / 2;
      const roundedMidValue = Math.round(midValue * 100) / 100;

      // Update the altitude field
      this.onFieldChange('altitude', roundedMidValue);
    });
  }

  onFieldChange(
    field: keyof FieldMeasure,
    value: FieldMeasure[keyof FieldMeasure]
  ): void {
    this.fieldChange.emit({ field, value });
  }
}
