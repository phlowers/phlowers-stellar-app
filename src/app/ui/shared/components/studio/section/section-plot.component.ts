import {
  Component,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { formatLitData } from './helpers/formatLitData';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import { uniq } from 'lodash';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

interface SearchSupportEvent {
  value: string;
}

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent {
  litData = input<GetSectionOutput | null>(null);
  selectedSpan = signal<number>(0);
  plotOptionsChange = output<PlotOptions>();
  isSupportZoom = input.required<boolean>();

  constructor(public readonly plotService: PlotService) {}

  supports = computed(() => {
    const supportsAmount = uniq(
      Object.values(this.litData()?.support ?? {})
    ).length;
    return Array.from({ length: supportsAmount }, (_, i) => ({
      item: (i + 1).toString()
    }));
  });

  errorMessage = computed(() => {
    if (
      this.plotService.plotOptions().startSupport >=
      this.plotService.plotOptions().endSupport
    ) {
      return $localize`Error: start >= end`;
    }
    if (
      !this.supports()
        .map((s) => s.item)
        .includes(this.plotService.plotOptions().startSupport.toString())
    ) {
      return $localize`Error: start not in list`;
    }
    if (
      !this.supports()
        .map((s) => s.item)
        .includes(this.plotService.plotOptions().endSupport.toString())
    ) {
      return $localize`Error: end not in list`;
    }
    return '';
  });

  searchSupport(event: SearchSupportEvent, type: 'start' | 'end') {
    const numberValue = Number(event.value);
    if (type === 'start') {
      this.plotOptionsChange.emit({
        ...this.plotService.plotOptions(),
        startSupport: numberValue
      });
    } else {
      this.plotOptionsChange.emit({
        ...this.plotService.plotOptions(),
        endSupport: numberValue
      });
    }
  }

  async refreshSection(
    litData: GetSectionOutput | null,
    plotOptions: PlotOptions,
    isSupportZoom: boolean
  ) {
    if (!litData) {
      return;
    }
    const myElement = document.getElementById('plotly-output');
    const width = myElement?.clientWidth ?? 0;
    const height = myElement?.clientHeight ?? 0;
    const formattedData = formatLitData(litData);
    const plotData = createPlotData(formattedData, plotOptions);
    return createPlot(
      'plotly-output',
      plotData,
      width,
      height,
      isSupportZoom,
      plotOptions.invert
    );
  }

  readonly effect = effect(() => {
    this.refreshSection(
      this.litData(),
      this.plotService.plotOptions(),
      this.isSupportZoom()
    );
  });
}
