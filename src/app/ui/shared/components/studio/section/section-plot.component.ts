import { Component, computed, effect, inject, input, signal } from '@angular/core';
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
import { Ground } from '@src/app/core/domain/models/ground.model';
import {
  appendExistingObstaclesWithFormObstacle,
  getObstacleClickPayload,
  ObstacleAnnotationData
} from './helpers/obstacles';
import {
  appendExistingGroundsWithFormGround,
  createGroundTraces,
  getGroundClickPayload,
  GroundAnnotationData
} from './helpers/grounds';
import { ObstaclesService } from '@src/app/ui/pages/studio/obstacles/obstacles.service';
import { GroundFormService } from '@src/app/ui/pages/studio/ground/groundForm/groundForm.service';
import { GroundsService } from '@src/app/ui/pages/studio/ground/grounds.service';

const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule]
})
/**
 * Renders an interactive Plotly section plot for a transmission-line study.
 * Listens to display options, obstacle positions, and span loads to keep the plot in sync.
 */
export class SectionPlotComponent {
  // Input
  /** Lit data output used to draw the section plot. `null` when no data is available. */
  litData = input<GetSectionOutput | null>(null);

  // Services
  private readonly plotService = inject(PlotService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly groundFormService = inject(GroundFormService);
  private readonly groundsService = inject(GroundsService);

  // Signals
  private readonly isPlotRefreshing = signal(false);

  // Form values as signals
  private readonly currentObstaclePositions = toSignal(this.obstacleFormService.form.get('positions')!.valueChanges, {
    initialValue: []
  });

  private readonly currentObstacleName = toSignal(this.obstacleFormService.form.get('name')!.valueChanges, {
    initialValue: ''
  });

  private readonly currentGroundPositions = toSignal(this.groundFormService.form.get('positions')!.valueChanges, {
    initialValue: []
  });

  // Computed state
  private readonly plotState = computed(() => ({
    litData: this.litData(),
    baseLitData: this.plotService.baseLitData(),
    plotOptions: this.plotService.plotOptions(),
    displayOptions: this.plotService.selectedDisplayOptions(),
    pointIndex: this.obstaclesService.currentPointIndex(),
    groundPointIndex: this.groundsService.currentPointIndex(),
    sideTabs: this.sideTabsService.sideTabs(),
    positions: this.currentObstaclePositions(),
    name: this.currentObstacleName(),
    groundPositions: this.currentGroundPositions()
  }));

  // Debounced plot refresh with signal
  private readonly debouncedPlotState = toSignal(
    toObservable(this.plotState).pipe(
      debounceTime(DEBOUNCED_REFRESH_STUDIO_DELAY),
      tap(() => this.refreshPlot())
    ),
    { initialValue: this.plotState() }
  );

  constructor() {
    // Setup effect for debounced state change
    effect(
      () => {
        this.debouncedPlotState();
      },
      { allowSignalWrites: true }
    );
  }

  /**
   * Get span loads to display based on selected options and plot view
   */
  private getSpanLoadsToDisplay(
    selectedDisplayOptions: SelectedDisplayOptions,
    plotOptions: PlotOptions
  ): (SpanLoad | null)[] {
    const section = this.plotService.section();

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

    return supportsUuids.map((supportUuid) => spanLoads.find((load) => load.supportUuid === supportUuid) ?? null);
  }

  private buildObstacleList(): Obstacle[] {
    const currentObstacle = this.obstacleFormService.form.value as Obstacle;
    const existingObstacles = this.plotService.section()?.obstacles ?? [];
    return appendExistingObstaclesWithFormObstacle(existingObstacles, currentObstacle);
  }

  private buildGroundList(): Ground[] {
    const currentGround = this.groundFormService.form.value as Ground;
    const existingGrounds = this.plotService.section()?.grounds ?? [];
    return appendExistingGroundsWithFormGround(existingGrounds, currentGround);
  }

  private getSupportsList() {
    return this.plotService.section()?.supports ?? [];
  }

  private getCurrentObstacleUuid(): string | null {
    return this.obstacleFormService.form.get('uuid')?.value ?? null;
  }

  private getCurrentGroundUuid(): string | null {
    return this.groundFormService.form.get('uuid')?.value ?? null;
  }

  /** Rebuilds and redraws the section plot with the latest data, options, and obstacles. */
  async refreshPlot(): Promise<void> {
    const litData = this.plotService.litData();
    if (!litData) return;

    try {
      this.isPlotRefreshing.set(true);
      const plotOptions = this.plotService.plotOptions();
      const selectedDisplayOptions = this.plotService.selectedDisplayOptions();
      const spanLoads = this.getSpanLoadsToDisplay(selectedDisplayOptions, plotOptions);
      const obstacles = this.buildObstacleList();
      const grounds = this.buildGroundList();
      const supports = this.getSupportsList();
      let plotData = createPlotData(litData, plotOptions, supports);

      if (selectedDisplayOptions.baseState && this.plotService.baseLitData()) {
        const shadowData = createShadowPlotData(this.plotService.baseLitData()!, plotOptions);
        plotData = [...(shadowData as typeof plotData), ...plotData];
      }

      const camera = this.plotService.camera();
      const currentObstacleUuid = this.getCurrentObstacleUuid();
      const currentObstaclePointIndex = this.obstaclesService.currentPointIndex();
      const currentGroundUuid = this.getCurrentGroundUuid();
      const currentGroundPointIndex = this.groundsService.currentPointIndex();

      const plotParams = {
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
        currentObstacleUuid,
        currentObstaclePointIndex,
        obstacles,
        grounds,
        currentGroundUuid,
        currentGroundPointIndex
      };

      const groundTraces = createGroundTraces(plotParams);
      plotParams.data = [...plotData, ...groundTraces];

      const plot = await createPlot(plotParams);
      if (plot) {
        this.addEventListenersToPlot(plot);
      }
    } catch (error) {
      console.error('Error refreshing plot:', error);
    } finally {
      this.isPlotRefreshing.set(false);
    }
  }

  addEventListenersToPlot = (plot: Plotly.PlotlyHTMLElement) => {
    interface ClickAnnotationEvent {
      annotation?: { data?: ObstacleAnnotationData | GroundAnnotationData };
    }
    (
      plot as Plotly.PlotlyHTMLElement & {
        on(e: 'plotly_clickannotation', fn: (event: ClickAnnotationEvent) => void): void;
      }
    ).on('plotly_clickannotation', (event: ClickAnnotationEvent) => {
      const annotationData = event?.annotation?.data;
      if (annotationData?.type === 'obstacle') {
        const section = this.plotService.section();
        const payload = getObstacleClickPayload(
          annotationData as ObstacleAnnotationData,
          section?.obstacles ?? [],
          section?.supports ?? []
        );
        if (!payload) return;
        this.sideTabsService.sideTabs.set(1);
        this.plotService.plotOptionsChange({
          startSupport: payload.supportIndex,
          endSupport: payload.supportIndex + 1
        });
        this.obstacleFormService.setExistingObstacle(payload.obstacle, payload.obstaclePositionIndex);
      } else if (annotationData?.type === 'ground') {
        const section = this.plotService.section();
        const payload = getGroundClickPayload(
          annotationData as GroundAnnotationData,
          section?.grounds ?? [],
          section?.supports ?? []
        );
        if (!payload) return;
        this.sideTabsService.sideTabs.set(2);
        this.plotService.plotOptionsChange({
          startSupport: payload.supportIndex,
          endSupport: payload.supportIndex + 1
        });
        this.groundFormService.setExistingGround(payload.ground, payload.groundPositionIndex);
      }
    });
  };
}
