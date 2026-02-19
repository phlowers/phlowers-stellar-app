import { Component, effect, input } from '@angular/core';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import { createShadowPlotData } from './helpers/createShadowPlotData';
import { PlotService, SelectedDisplayOptions } from '@src/app/ui/pages/studio/services/plot.service';
import { SpanLoad } from '@src/app/core';
import { LoadType } from './helpers/createLoadAnnotations';

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent {
  litData = input<GetSectionOutput | null>(null);
  isSupportZoom = input.required<boolean>();

  constructor(public readonly plotService: PlotService) {}

  getSpanLoadsToDisplay = (selectedDisplayOptions: SelectedDisplayOptions, plotOptions: PlotOptions) => {
    if (!selectedDisplayOptions.loads) {
      return [];
    }
    const section = this.plotService.section();
    if (!section) {
      return [];
    }
    const supportsUuids = section.supports
      .slice(plotOptions.startSupport, plotOptions.endSupport)
      .map((support) => support.uuid);
    const spanLoads =
      this.plotService.temporaryLoadData?.spanLoads?.filter(
        (load) => !!load && (!!load.loadWeight || load.type === LoadType.MARKING)
      ) ?? [];
    const result: (SpanLoad | null)[] = [];
    for (const supportUuid of supportsUuids) {
      const load = spanLoads.find((load) => load.supportUuid === supportUuid);
      if (load) {
        result.push(load);
      } else {
        result.push(null);
      }
    }
    return result;
  };

  async refreshPlot(
    litData: GetSectionOutput | null,
    baseLitData: GetSectionOutput | null,
    plotOptions: PlotOptions,
    isSupportZoom: boolean,
    _isSidebarOpen: boolean,
    selectedDisplayOptions: SelectedDisplayOptions
  ) {
    if (!litData) {
      return;
    }
    const spanLoads = this.getSpanLoadsToDisplay(selectedDisplayOptions, plotOptions);
    let plotData = createPlotData(litData, plotOptions);

    // Add shadow traces for base state if enabled
    if (selectedDisplayOptions.baseState && baseLitData) {
      const shadowData = createShadowPlotData(baseLitData, plotOptions);
      plotData = [...shadowData, ...plotData];
    }

    const camera = this.plotService.camera();
    return createPlot({
      plotId: 'plotly-output',
      data: plotData,
      isSupportZoom,
      invert: plotOptions.invert,
      view: plotOptions.view,
      camera,
      side: plotOptions.side,
      spanLoads,
      litData,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport
    });
  }

  readonly effect = effect(() => {
    this.refreshPlot(
      this.litData(),
      this.plotService.baseLitData(),
      this.plotService.plotOptions(),
      this.isSupportZoom(),
      this.plotService.isSidebarOpen(),
      this.plotService.selectedDisplayOptions()
    );
  });
}
