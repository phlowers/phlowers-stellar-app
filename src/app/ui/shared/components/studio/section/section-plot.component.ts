import { Component, effect, input } from '@angular/core';
import { GetSectionOutput } from '@src/app/core/services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import { PlotService } from '@src/app/ui/pages/studio/plot.service';

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent {
  litData = input<GetSectionOutput | null>(null);
  isSupportZoom = input.required<boolean>();

  constructor(public readonly plotService: PlotService) {}

  async refreshPlot(
    litData: GetSectionOutput | null,
    plotOptions: PlotOptions,
    isSupportZoom: boolean,
    _isSidebarOpen: boolean // eslint-disable-line @typescript-eslint/no-unused-vars
  ) {
    if (!litData) {
      return;
    }
    const plotData = createPlotData(litData, plotOptions);
    return createPlot(
      'plotly-output',
      plotData,
      isSupportZoom,
      plotOptions.invert,
      plotOptions.view
    );
  }

  readonly effect = effect(() => {
    this.refreshPlot(
      this.litData(),
      this.plotService.plotOptions(),
      this.isSupportZoom(),
      this.plotService.isSidebarOpen()
    );
  });
}
