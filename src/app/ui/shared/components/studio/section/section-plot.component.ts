import { Component, DestroyRef, inject, input } from '@angular/core';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import {
  PLOT_ID,
  PlotService,
  SelectedDisplayOptions
} from '@src/app/ui/pages/studio/services/plot.service';
import { SpanLoad } from '@src/app/core';
import { LoadType } from './helpers/createLoadAnnotations';
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { combineLatest, debounceTime, of, startWith } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { DEBOUNCED_REFRESH_STUDIO_DELAY } from '../free-positioning/free-positioning.component';
import { ObstacleFormService } from '@src/app/ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { Obstacle } from '@src/app/core/domain/models/obstacle.model';
import {
  appendExistingObstaclesWithFormObstacle,
  getObstacleClickPayload,
  ObstacleAnnotationData
} from './helpers/obstacles';
import { ObstaclesService } from '@src/app/ui/pages/studio/obstacles/obstacles.service';

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent {
  litData = input<GetSectionOutput | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly plotService: PlotService,
    public readonly sideTabsService: SideTabsService,
    public readonly obstacleFormService: ObstacleFormService,
    public readonly obstaclesService: ObstaclesService
  ) {
    combineLatest([
      toObservable(this.litData),
      toObservable(this.plotService.plotOptions),
      toObservable(this.plotService.selectedDisplayOptions),
      toObservable(this.plotService.isFreePositioningMode),
      toObservable(this.obstaclesService.currentPointIndex),
      toObservable(this.sideTabsService.sideTabs),
      (
        this.obstacleFormService.form.get('positions')?.valueChanges ?? of([])
      ).pipe(startWith([])),
      (this.obstacleFormService.form.get('name')?.valueChanges ?? of('')).pipe(
        startWith('')
      )
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        debounceTime(DEBOUNCED_REFRESH_STUDIO_DELAY)
      )
      .subscribe(this.refreshPlot);
  }

  getSpanLoadsToDisplay = (
    selectedDisplayOptions: SelectedDisplayOptions,
    plotOptions: PlotOptions
  ) => {
    const section = this.plotService.section()!;
    if (!selectedDisplayOptions.loads || !section) {
      return [];
    }
    const supportsUuids = section.supports
      .slice(plotOptions.startSupport, plotOptions.endSupport)
      .map((support) => support.uuid);
    const spanLoads =
      this.plotService.temporaryLoadData?.spanLoads?.filter(
        (load) =>
          !!load && (!!load.loadWeight || load.type === LoadType.MARKING)
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

  refreshPlot = async () => {
    const litData = this.plotService.litData();
    const plotOptions = this.plotService.plotOptions();
    const selectedDisplayOptions = this.plotService.selectedDisplayOptions();
    if (!litData) {
      return;
    }
    const spanLoads = this.getSpanLoadsToDisplay(
      selectedDisplayOptions,
      plotOptions
    );
    const currentObstacle = this.obstacleFormService.form.value as Obstacle;
    const obstacles = appendExistingObstaclesWithFormObstacle(
      this.plotService.section()?.obstacles ?? [],
      currentObstacle
    );
    const supports = this.plotService.section()?.supports ?? [];
    const plotData = createPlotData(litData, plotOptions, supports);
    const camera = this.plotService.camera();
    const plot = await createPlot({
      plotId: PLOT_ID,
      data: plotData,
      invert: plotOptions.invert,
      view: plotOptions.view,
      camera,
      side: plotOptions.side,
      spanLoads,
      litData,
      startSupport: plotOptions.startSupport,
      endSupport: plotOptions.endSupport,
      currentObstacleUuid:
        this.obstacleFormService.form.get('uuid')?.value ?? null,
      currentObstaclePointIndex: this.obstaclesService.currentPointIndex(),
      obstacles
    });
    if (plot) {
      this.addEventListenersToPlot(plot);
    }
    return plot;
  };

  addEventListenersToPlot = (plot: Plotly.PlotlyHTMLElement) => {
    interface ClickAnnotationEvent {
      annotation?: { data?: ObstacleAnnotationData };
    }
    (
      plot as Plotly.PlotlyHTMLElement & {
        on(
          e: 'plotly_clickannotation',
          fn: (event: ClickAnnotationEvent) => void
        ): void;
      }
    ).on('plotly_clickannotation', (event: ClickAnnotationEvent) => {
      if (event?.annotation?.data?.type === 'obstacle') {
        const section = this.plotService.section();
        const payload = getObstacleClickPayload(
          event?.annotation?.data,
          section?.obstacles ?? [],
          section?.supports ?? []
        );
        if (!payload) return;
        this.sideTabsService.sideTabs.set(1);
        this.plotService.plotOptionsChange({
          startSupport: payload.supportIndex,
          endSupport: payload.supportIndex + 1
        });
        this.obstacleFormService.setExistingObstacle(
          payload.obstacle,
          payload.obstaclePositionIndex
        );
      }
    });
  };
}
