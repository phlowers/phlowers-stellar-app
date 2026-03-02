import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
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
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { debounceTime, tap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { ObstacleFormService } from '@src/app/ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { ObstaclesService } from '@ui/pages/studio/obstacles/obstacles.service';
import { Obstacle } from '@core/domain/models/obstacle.model';
import { LoadType } from './helpers/createLoadAnnotations';

const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
export class SectionPlotComponent implements OnDestroy {
  // Input
  readonly litData = input<GetSectionOutput | null>(null);

  // Services
  private readonly plotService = inject(PlotService);
  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstaclesService = inject(ObstaclesService);

  // State
  readonly isPlotRefreshing = signal(false);

  // Debounced reactive trigger
  private readonly triggerSignal = computed(() => {
    this.litData();
    this.plotService.litData();
    this.plotService.plotOptions();
    this.plotService.selectedDisplayOptions();
    this.plotService.axesNorms();
    this.sideTabsService.sideTabs();
    return undefined;
  });

  private readonly subscription: Subscription = toObservable(this.triggerSignal).pipe(
    debounceTime(DEBOUNCED_REFRESH_STUDIO_DELAY),
    tap(() => this.refreshPlot())
  ).subscribe();

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private buildObstacleList(): Obstacle[] {
    const currentObstacle = this.obstacleFormService.form.value;
    const existingObstacles = (this.plotService.section()?.obstacles ?? []) as Obstacle[];

    if (!currentObstacle || !currentObstacle.uuid) {
      return [...existingObstacles];
    }

    const hasExisting = existingObstacles.some((o: Obstacle) => o.uuid === currentObstacle.uuid);
    if (hasExisting) {
      return existingObstacles.map((o: Obstacle) =>
        o.uuid === currentObstacle.uuid ? (currentObstacle as Obstacle) : o
      );
    }
    return [...existingObstacles, currentObstacle as Obstacle];
  }

  private getSupportsList(): readonly import('@core/domain/models/support.model').Support[] | never[] {
    return this.plotService.section()?.supports ?? [];
  }

  private getCurrentObstacleUuid(): string | null {
    return this.obstacleFormService.form.get('uuid')?.value ?? null;
  }

  private getSpanLoadsToDisplay(
    selectedDisplayOptions: SelectedDisplayOptions,
    plotOptions: PlotOptions
  ): (SpanLoad | null)[] {
    if (!selectedDisplayOptions.loads) {
      return [];
    }

    const section = this.plotService.section();
    if (!section) {
      return [];
    }

    const length = plotOptions.endSupport - plotOptions.startSupport;
    const spanLoads = this.plotService.temporaryLoadData?.spanLoads;

    if (!spanLoads) {
      return Array<SpanLoad | null>(length).fill(null);
    }

    const result: (SpanLoad | null)[] = [];
    for (let i = plotOptions.startSupport; i < plotOptions.endSupport; i++) {
      const load: SpanLoad | undefined = spanLoads[i];
      if (load && (load.loadWeight > 0 || load.type === LoadType.MARKING)) {
        result.push(load);
      } else {
        result.push(null);
      }
    }
    return result;
  }

  private getCurrentObstaclePointIndex(): number {
    return this.obstaclesService.currentPointIndex();
  }

  /** Rebuilds and redraws the section plot with the latest data, options, and obstacles. */
  async refreshPlot(): Promise<void> {
    const litData = this.plotService.litData();
    if (!litData) {
      return;
    }

    try {
      this.isPlotRefreshing.set(true);
      const baseLitData = this.plotService.baseLitData();
      const plotOptions = this.plotService.plotOptions();
      const selectedDisplayOptions = this.plotService.selectedDisplayOptions();
      const spanLoads = this.getSpanLoadsToDisplay(selectedDisplayOptions, plotOptions);
      const obstacles = this.buildObstacleList();
      const supports = this.getSupportsList();
      let plotData = createPlotData(litData, plotOptions, supports as import('@core/domain/models/support.model').Support[]);

      if (selectedDisplayOptions.baseState && baseLitData) {
        const shadowData = createShadowPlotData(baseLitData, plotOptions);
        plotData = [...(shadowData as typeof plotData), ...plotData];
      }

      const camera = this.plotService.camera();
      const currentObstacleUuid = this.getCurrentObstacleUuid();
      const currentObstaclePointIndex = this.getCurrentObstaclePointIndex();
      const axesNorms = this.plotService.axesNorms();

      await createPlot({
        plotId: PLOT_ID,
        data: plotData,
        isSupportZoom: false,
        invert: plotOptions.invert,
        view: plotOptions.view,
        camera,
        side: plotOptions.side,
        spanLoads,
        litData,
        startSupport: plotOptions.startSupport,
        endSupport: plotOptions.endSupport,
        obstacles,
        currentObstacleUuid,
        currentObstaclePointIndex,
        axesNorms
      });
    } catch (error) {
      console.error('Error refreshing plot:', error);
    } finally {
      this.isPlotRefreshing.set(false);
    }
  }
}
