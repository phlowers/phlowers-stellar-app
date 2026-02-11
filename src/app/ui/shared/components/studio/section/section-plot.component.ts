import { Component, computed, DestroyRef, effect, inject, input } from '@angular/core';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions } from './helpers/types';
import { createPlotData } from './helpers/createPlotData';
import { createShadowPlotData } from './helpers/createShadowPlotData';
import { PLOT_ID, PlotService, SelectedDisplayOptions } from '@src/app/ui/pages/studio/services/plot.service';
import { SpanLoad } from '@src/app/core';
import { LoadType } from './helpers/createLoadAnnotations';
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { debounceTime, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ObstacleFormService } from '@src/app/ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { Obstacle } from '@src/app/core/domain/models/obstacle.model';
import { appendExistingObstaclesWithFormObstacle } from './helpers/obstacles';
import { ObstaclesService } from '@src/app/ui/pages/studio/obstacles/obstacles.service';
import { DataObject } from './helpers/createPlotDataObject';

const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent {
  litData = input<GetSectionOutput | null>(null);
  private readonly destroyRef = inject(DestroyRef);

  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly obstaclesService = inject(ObstaclesService);

  rawState = computed(() => ({
    litData: this.litData(),
    baseLitData: this.plotService.baseLitData(),
    plotOptions: this.plotService.plotOptions(),
    displayOptions: this.plotService.selectedDisplayOptions(),
    pointIndex: this.obstaclesService.currentPointIndex(),
    sideTabs: this.sideTabsService.sideTabs(),
    positions: this.currentObstaclePositions(),
    name: this.currentObstacleName()
  }));

  constructor(
    public readonly plotService: PlotService,
    public readonly sideTabsService: SideTabsService
  ) {
    const debouncedState = toSignal(
      toObservable(this.rawState).pipe(
        debounceTime(DEBOUNCED_REFRESH_STUDIO_DELAY),
        tap(() => this.refreshPlot())
      ),
      { initialValue: this.rawState() }
    );

    effect(() => {
      debouncedState();
    });
  }

  currentObstaclePositions = toSignal(this.obstacleFormService.form.get('positions')!.valueChanges, {
    initialValue: []
  });
  currentObstacleName = toSignal(this.obstacleFormService.form.get('name')!.valueChanges, {
    initialValue: ''
  });

  getSpanLoadsToDisplay = (selectedDisplayOptions: SelectedDisplayOptions, plotOptions: PlotOptions) => {
    const section = this.plotService.section()!;
    if (!selectedDisplayOptions.loads || !section) {
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

  refreshPlot = async () => {
    const litData = this.plotService.litData();
    const baseLitData = this.plotService.baseLitData();
    const plotOptions = this.plotService.plotOptions();
    const selectedDisplayOptions = this.plotService.selectedDisplayOptions();
    if (!litData) {
      return;
    }
    const spanLoads = this.getSpanLoadsToDisplay(selectedDisplayOptions, plotOptions);
    const currentObstacle = this.obstacleFormService.form.value as Obstacle;
    const obstacles = appendExistingObstaclesWithFormObstacle(
      this.plotService.section()?.obstacles ?? [],
      currentObstacle
    );
    let plotData = createPlotData(litData, plotOptions, this.plotService.section()?.supports ?? []);

    // Add shadow traces for base state if enabled
    if (selectedDisplayOptions.baseState && baseLitData) {
      const shadowData = createShadowPlotData(baseLitData, plotOptions);
      const shadowDataWithSupport: DataObject[] = shadowData.map((trace) => ({
        ...trace,
        supportUuid: undefined
      }));
      plotData = [...shadowDataWithSupport, ...plotData];
    }

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
      currentObstacleUuid: this.obstacleFormService.form.get('uuid')?.value ?? null,
      currentObstaclePointIndex: this.obstaclesService.currentPointIndex(),
      obstacles
    });
    return plot;
  };
}
