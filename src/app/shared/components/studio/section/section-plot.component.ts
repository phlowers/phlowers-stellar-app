import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions } from '@shared/types/plot.types';
import { createPlotData } from './helpers/createPlotData';
import { createShadowPlotData } from './helpers/createShadowPlotData';
import { PLOT_ID, PlotService, SelectedDisplayOptions } from '@services/plot/plot.service';
import { SpanLoad } from '@shared/domain';
import { LoadType, SpanLoadAnnotationData } from './helpers/createLoadAnnotations';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { debounceTime, tap } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import {
  appendExistingObstaclesWithFormObstacle,
  getObstacleClickPayload,
  ObstacleAnnotationData
} from './helpers/obstacles';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';

const DEBOUNCED_REFRESH_STUDIO_DELAY = 300;

@Component({
  selector: 'app-section-plot',
  templateUrl: './section-plot.component.html',
  imports: [SelectModule, FormsModule, KeyFilterModule, MessageModule],
  changeDetection: ChangeDetectionStrategy.OnPush
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
  private readonly loadFormsService = inject(LoadFormsService);

  // Signals
  private readonly isPlotRefreshing = signal(false);

  // Form values as signals
  private readonly currentObstaclePositions = toSignal(this.obstacleFormService.form.get('positions')!.valueChanges, {
    initialValue: []
  });

  private readonly currentObstacleName = toSignal(this.obstacleFormService.form.get('name')!.valueChanges, {
    initialValue: ''
  });

  private readonly currentAltitudeType = toSignal(this.obstacleFormService.form.get('altitudeType')!.valueChanges, {
    initialValue: 'absolute'
  });

  private readonly currentReferenceSupport = toSignal(
    this.obstacleFormService.form.get('referenceSupport')!.valueChanges,
    { initialValue: null }
  );

  // Computed state
  private readonly plotState = computed(() => ({
    litData: this.litData(),
    baseLitData: this.plotService.baseLitData(),
    plotOptions: this.plotService.plotOptions(),
    displayOptions: this.plotService.selectedDisplayOptions(),
    axesNorms: this.plotService.axesNorms(),
    selectedObstacleUuid: this.obstaclesService.selectedObstacleUuid(),
    activePointIndex: this.obstaclesService.activePointIndex(),
    sideTabs: this.sideTabsService.sideTabs(),
    positions: this.currentObstaclePositions(),
    name: this.currentObstacleName(),
    altitudeType: this.currentAltitudeType(),
    referenceSupport: this.currentReferenceSupport()
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
    effect(() => {
      this.debouncedPlotState();
    });
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
        (load) =>
          !!load &&
          (load.type === LoadType.MARKING ? load.loadPosition !== 0 : load.loadWeight !== 0 || load.loadPosition !== 0)
      ) ?? [];

    return supportsUuids.map((supportUuid) => spanLoads.find((load) => load.supportUuid === supportUuid) ?? null);
  }

  private buildObstacleList(): Obstacle[] {
    const currentObstacle = this.obstacleFormService.form.value as Obstacle;
    const existingObstacles = this.plotService.section()?.obstacles ?? [];
    return appendExistingObstaclesWithFormObstacle(existingObstacles, currentObstacle);
  }

  private getSupportsList() {
    return this.plotService.section()?.supports ?? [];
  }

  private getCurrentObstacleUuid(): string | null {
    return this.obstaclesService.selectedObstacleUuid();
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
      const supports = this.getSupportsList();
      let plotData = createPlotData(litData, plotOptions, supports);

      if (selectedDisplayOptions.baseState && this.plotService.baseLitData()) {
        const shadowData = createShadowPlotData(this.plotService.baseLitData()!, plotOptions);
        plotData = [...(shadowData as typeof plotData), ...plotData];
      }

      const camera = this.plotService.camera();
      const currentObstacleUuid = this.getCurrentObstacleUuid();
      const currentObstaclePointIndex = this.obstaclesService.activePointIndex() ?? 0;
      const axesNorms = this.plotService.axesNorms();

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
        currentObstacleUuid,
        currentObstaclePointIndex,
        obstacles,
        supports,
        axesNorms
      });
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
      annotation?: { data?: ObstacleAnnotationData | SpanLoadAnnotationData };
    }
    (
      plot as Plotly.PlotlyHTMLElement & {
        on(e: 'plotly_clickannotation', fn: (event: ClickAnnotationEvent) => void): void;
        on(e: 'plotly_relayout', fn: () => void): void;
      }
    ).on('plotly_clickannotation', (event: ClickAnnotationEvent) => {
      if (event?.annotation?.data?.type === 'obstacle') {
        const section = this.plotService.section();
        const payload = getObstacleClickPayload(
          event?.annotation?.data as ObstacleAnnotationData,
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
      } else if (event?.annotation?.data?.type === 'spanLoad') {
        const data = event.annotation.data as SpanLoadAnnotationData;
        this.sideTabsService.sideTabs.set(0);
        this.loadFormsService.activeLoadTab.set('1');
        this.loadFormsService.selectedSpanSupportUuid.set(data.supportUuid);
        this.obstaclesService.setSelectedObstacle(payload.obstacle.uuid, payload.obstaclePositionIndex);
      }
    });

    (
      plot as Plotly.PlotlyHTMLElement & {
        on(e: 'plotly_relayout', fn: () => void): void;
      }
    ).on('plotly_relayout', () => {
      this.plotService.refreshCamera();
    });
  };
}
