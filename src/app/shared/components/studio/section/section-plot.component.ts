import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { GetSectionOutput } from '@services/worker_python/tasks/types';
import { createPlot } from './helpers/createPlot';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { KeyFilterModule } from 'primeng/keyfilter';
import { MessageModule } from 'primeng/message';
import { PlotOptions, PLOT_ID, SelectedDisplayOptions } from '@shared/types/plot.types';
import { createPlotData } from './helpers/createPlotData';
import { createShadowPlotData } from './helpers/createShadowPlotData';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SpanLoad } from '@shared/domain';
import { LoadType, SpanLoadAnnotationData } from './helpers/createLoadAnnotations';
import { CableModificationAnnotationData } from './helpers/createCableModificationAnnotations.interfaces';
import { CableModificationsService } from '@features/studio/loads/presentation/services/cableModifications.service';
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
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';

import { STUDIO_PLOT_DEBOUNCE_DELAY } from '@shared/components/studio/section/helpers/plot.constants';

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
export class SectionPlotComponent implements OnDestroy {
  // Input
  /** Lit data output used to draw the section plot. `null` when no data is available. */
  litData = input<GetSectionOutput | null>(null);

  // Services
  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly loadFormsService = inject(LoadFormsService);
  private readonly cableModificationsService = inject(CableModificationsService);
  private readonly logger = inject(LoggerService);
  private readonly obstacleStateService = inject(ObstacleStateService);
  private readonly documentRef = inject(DOCUMENT);

  // Signals
  private readonly isPlotRefreshing = signal(false);

  /** True when at least one cable length modification is persisted on the current section. */
  readonly hasCableModifications = computed(() => (this.spanService.section()?.cable_modifications?.length ?? 0) > 0);

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
    plotOptions: this.plotOptionsService.plotOptions(),
    displayOptions: this.plotOptionsService.selectedDisplayOptions(),
    axesNorms: this.plotOptionsService.axesNorms(),
    selectedObstacleUuid: this.obstaclesService.selectedObstacleUuid(),
    activePointIndex: this.obstaclesService.activePointIndex(),
    sideTabs: this.sideTabsService.sideTabs(),
    positions: this.currentObstaclePositions(),
    name: this.currentObstacleName(),
    altitudeType: this.currentAltitudeType(),
    referenceSupport: this.currentReferenceSupport(),
    distances: this.obstacleStateService.distances(),
    distanceType: this.obstacleStateService.distanceType(),
    cableModifications: this.spanService.section()?.cable_modifications ?? [],
    previewCableModification: this.cableModificationsService.previewCableModification()
  }));

  // Debounced plot refresh with signal
  private readonly debouncedPlotState = toSignal(
    toObservable(this.plotState).pipe(
      debounceTime(STUDIO_PLOT_DEBOUNCE_DELAY),
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
    const section = this.spanService.section();

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
    const existingObstacles = this.spanService.section()?.obstacles ?? [];
    return appendExistingObstaclesWithFormObstacle(existingObstacles, currentObstacle);
  }

  /** Rebuilds and redraws the section plot with the latest data, options, and obstacles. */
  async refreshPlot(): Promise<void> {
    const litData = this.plotService.litData();
    if (!litData) return;

    try {
      this.isPlotRefreshing.set(true);
      const plotOptions = this.plotOptionsService.plotOptions();
      const selectedDisplayOptions = this.plotOptionsService.selectedDisplayOptions();
      const spanLoads = this.getSpanLoadsToDisplay(selectedDisplayOptions, plotOptions);
      const obstacles = this.buildObstacleList();
      const supports = this.spanService.section()?.supports ?? [];
      const sectionPlotData = createPlotData(litData, plotOptions, supports);
      let plotData: Plotly.Data[] = Array.isArray(sectionPlotData) ? sectionPlotData : [];

      if (selectedDisplayOptions.baseState && this.plotService.baseLitData()) {
        const shadowData = createShadowPlotData(this.plotService.baseLitData()!, plotOptions);
        const safeShadowData: Plotly.Data[] = Array.isArray(shadowData) ? shadowData : [];
        plotData = [...safeShadowData, ...plotData];
      }

      const camera = this.plotOptionsService.camera();
      const currentObstacleUuid = this.obstaclesService.selectedObstacleUuid();
      const currentObstaclePointIndex = this.obstaclesService.activePointIndex() ?? 0;
      const axesNorms = this.plotOptionsService.axesNorms();

      const distances = this.obstacleStateService.distances();
      const distanceType = this.obstacleStateService.distanceType();
      const section = this.spanService.section();
      const savedCableModifications = section?.cable_modifications ?? [];
      const preview = this.cableModificationsService.previewCableModification();
      // The preview (current Calculate input) takes precedence over the saved
      // modification on the same span so the icon reflects what the user is
      // currently looking at, even before pressing Save.
      const cableModifications = preview
        ? [preview, ...savedCableModifications.filter((m) => m.spanUuid !== preview.spanUuid)]
        : savedCableModifications;
      const spanUuidToIndex = new Map<string, number>(
        (section?.supports ?? []).map((support, index) => [support.uuid, index])
      );
      const plot = await createPlot({
        documentRef: this.documentRef,
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
        axesNorms,
        distances,
        distanceType,
        cableModifications,
        spanUuidToIndex
      });
      if (plot) {
        this.addEventListenersToPlot(plot);
      }
    } catch (error) {
      this.logger.error('Error refreshing plot:', error);
    } finally {
      this.isPlotRefreshing.set(false);
    }
  }

  addEventListenersToPlot = (plot: Plotly.PlotlyHTMLElement) => {
    interface ClickAnnotationEvent {
      annotation?: { data?: ObstacleAnnotationData | SpanLoadAnnotationData | CableModificationAnnotationData };
    }
    const plotEl = plot as Plotly.PlotlyHTMLElement & {
      on(e: 'plotly_clickannotation', fn: (event: ClickAnnotationEvent) => void): void;
      on(e: 'plotly_relayout', fn: (eventData: Record<string, unknown>) => void): void;
      removeAllListeners(e: string): void;
    };
    // Remove stale listeners before re-adding — the plot element is reused across refreshes,
    // and each refresh call would otherwise accumulate a new listener, causing a memory leak.
    plotEl.removeAllListeners('plotly_clickannotation');
    plotEl.removeAllListeners('plotly_relayout');
    plotEl.on('plotly_clickannotation', (event: ClickAnnotationEvent) => {
      if (event?.annotation?.data?.type === 'obstacle') {
        const section = this.spanService.section();
        const payload = getObstacleClickPayload(
          event?.annotation?.data as ObstacleAnnotationData,
          section?.obstacles ?? [],
          section?.supports ?? []
        );
        if (!payload) return;
        this.sideTabsService.sideTabs.set(1);
        this.obstaclesService.setSelectedObstacle(payload.obstacle.uuid, payload.obstaclePositionIndex);
        this.obstacleFormService.setExistingObstacle(payload.obstacle, payload.obstaclePositionIndex);
      } else if (event?.annotation?.data?.type === 'spanLoad') {
        const data = event.annotation.data;
        this.sideTabsService.sideTabs.set(0);
        this.loadFormsService.activeLoadTab.set('1');
        this.loadFormsService.selectedSpanSupportUuid.set(data.supportUuid);
      } else if (event?.annotation?.data?.type === 'cableModification') {
        const data = event.annotation.data;
        this.sideTabsService.sideTabs.set(0);
        this.loadFormsService.activeLoadTab.set('2');
        this.cableModificationsService.selectSpan(data.spanUuid);
      }
    });

    plotEl.on('plotly_relayout', (eventData: Record<string, unknown>) => {
      // Only synchronise the camera signal when the relayout event actually contains
      // camera data. Clicking modebar buttons like "Zoom" or "Pan" fires relayout
      // with only { 'scene.dragmode': '...' }. Calling refreshCamera() on those
      // events can read a transient or stale camera from the DOM and corrupt the
      // camera signal.
      const hasCameraKey = Object.keys(eventData ?? {}).some((k) => k.includes('camera'));
      if (hasCameraKey) {
        this.plotOptionsService.refreshCamera();
      }
    });
  };

  ngOnDestroy(): void {
    this.plotService.purgePlot();
  }
}
