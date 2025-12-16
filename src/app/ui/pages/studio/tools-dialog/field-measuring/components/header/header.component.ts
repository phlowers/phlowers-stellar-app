import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { FieldMeasureData } from '../../types';
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
  measureData = input.required<FieldMeasureData>();
  spanOptions = input.required<SelectOption[]>();
  fieldChange = output<{
    field: keyof FieldMeasureData;
    value: FieldMeasureData[keyof FieldMeasureData];
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

  constructor(private readonly plotService: PlotService) {}

  onFieldChange(
    field: keyof FieldMeasureData,
    value: FieldMeasureData[keyof FieldMeasureData]
  ): void {
    this.fieldChange.emit({ field, value });
  }
}
