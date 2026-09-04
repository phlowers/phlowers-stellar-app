/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import Plotly, { PlotlyHTMLElement } from 'plotly.js-dist-min';
import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { projectOnSpanAxis } from '@shared/domain/floor/floor-form.helpers';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { Support } from '@shared/domain';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { formatStudioError } from '@shared/components/studio/helpers/errors';
import { debounce } from 'lodash';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import {
  DEBOUNCED_REFRESH_STUDIO_DELAY,
  DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY,
  FLOOR_FREE_POSITIONING_PLOT_ID,
  getFloorFreePositioningPlotConfig,
  getFloorFreePositioningPlotLayout,
  POINT_SELECTION_PIXEL_RADIUS
} from './floor-free-positioning.component.constantes';
import { MousePosition, PlotAnnotation, PlotElement, PlotLayout } from './floor-free-positioning.component.interfaces';

/**
 * Floor tab counterpart to `FreePositioningComponent`: a single profile plot (distance to ref. support / altitude)
 * for clicking a free floor point into place. Unlike obstacles, floor points have no lateral (y) axis to edit.
 */
@Component({
  selector: 'app-floor-free-positioning',
  standalone: true,
  imports: [ProgressSpinnerModule, TranslocoModule],
  templateUrl: './floor-free-positioning.component.html',
  styleUrl: './floor-free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorFreePositioningComponent implements OnDestroy {
  readonly plotService = inject(PlotService);
  private readonly translocoService = inject(TranslocoService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  readonly floorFormService = inject(FloorFormService);
  readonly sideTabsService = inject(SideTabsService);
  private readonly logger = inject(LoggerService);

  readonly isLoading = signal<boolean>(true);
  readonly plot = signal<PlotlyHTMLElement | null>(null);
  readonly mousePosition = signal<MousePosition | null>(null);

  private detachEventListeners: (() => void) | null = null;
  private destroyed = false;

  readonly getErrorString = () => {
    const exceptionDiagnostic = this.plotService.diagnostics().find((diagnostic) => diagnostic.origin === 'exception');
    return formatStudioError(this.plotService.error(), this.translocoService, exceptionDiagnostic?.code ?? null);
  };

  /** Reactive read of `points`, since the FormArray itself isn't a signal — drives the marker-refresh effect below. */
  private readonly pointsValue = toSignal(this.floorFormService.points.valueChanges, {
    initialValue: this.floorFormService.points.value
  });

  /** Recreates the plot whenever the worker output, lit data, or the span/side being edited change. */
  private readonly recreatePlotEffect = effect(() => {
    const workerReady = this.plotService.workerReady();
    const litData = this.plotService.litData();
    // The plot draws the span the form edits, from its reference support: both frame its geometry.
    this.floorFormService.spanValue();
    this.floorFormService.referenceSupportValue();

    if (workerReady && litData) {
      untracked(() => this.recreatePlot());
    }
  });

  /** Relayouts the plot after the side panel is opened/closed/resized (its width changes). */
  private readonly relayoutOnSideTabsEffect = effect(() => {
    this.sideTabsService.sideTabs();

    untracked(() => {
      setTimeout(() => {
        this.relayoutPlot();
      }, DEBOUNCED_REFRESH_STUDIO_DELAY);
    });
  });

  /** Refreshes the point markers whenever the active point or any point's value changes. */
  private readonly updateMarkersEffect = effect(() => {
    this.floorFormService.activePointIndex();
    this.pointsValue();

    untracked(() => this.debounceUpdateSelectedPositionMarkers());
  });

  recreatePlot = debounce(async () => {
    this.destroyPlot();
    // The span being edited, not the plot options' range: the form drives this plot, and the studio
    // view may well sit on another span (or on the whole section).
    const spanIndex = this.spanService.getSupportIndex(this.floorFormService.spanValue() ?? '');
    this.isLoading.set(true);

    const currentLitData = this.plotService.litData();
    if (!currentLitData) {
      this.isLoading.set(false);
      return;
    }

    const supports = this.spanService.section()?.supports ?? [];
    await this.createPlot(currentLitData, spanIndex, supports);
    this.isLoading.set(false);
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  debounceUpdateSelectedPositionMarkers = debounce(() => {
    this.updateSelectedPositionMarkers();
  }, DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY);

  relayoutPlot(): void {
    const plot = this.plot();
    if (plot) {
      Plotly.relayout(plot, getFloorFreePositioningPlotLayout());
    }
  }

  private destroyPlot(): void {
    this.detachEventListeners?.();
    this.detachEventListeners = null;
    const plot = this.plot();
    if (plot) {
      Plotly.purge(plot);
      this.plot.set(null);
    }
  }

  private handleMouseMove(evt: MouseEvent, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout) return;

    const x = evt.layerX - layout.margin.l;
    const y = evt.layerY - layout.margin.t;

    this.mousePosition.set({
      x: Number(layout.xaxis.p2c(x)).toFixed(2),
      z: Number(layout.yaxis.p2c(y)).toFixed(2)
    });
  }

  /** Places the active free point at the clicked distance/altitude. No-op if the active point isn't a free point. */
  private handleClick(evt: MouseEvent, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout || !plotElement) return;

    const x = evt.layerX - layout.margin.l;
    const y = evt.layerY - layout.margin.t;
    const plotWidth = plotElement.clientWidth - layout.margin.l - layout.margin.r;
    const plotHeight = plotElement.clientHeight - layout.margin.t - layout.margin.b;
    if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return;

    // Clicking on (or very near) an existing point selects it instead of moving the active one,
    // keeping this plot's selection in sync with the floor form's point list.
    const nearestPointIndex = this.findPointAtPixel(layout, x, y);
    if (nearestPointIndex !== null) {
      this.floorFormService.setActivePoint(nearestPointIndex);
      return;
    }

    const activeIndex = this.floorFormService.activePointIndex();
    if (activeIndex === null || !this.floorFormService.pointsView()[activeIndex]?.meta.removable) return;

    this.floorFormService.setFreePointPosition(activeIndex, {
      distanceToRefSupport: Number.parseFloat(layout.xaxis.p2c(x).toFixed(2)),
      altitude: Number.parseFloat(layout.yaxis.p2c(y).toFixed(2))
    });
  }

  /** Returns the index of the floor point whose marker is within {@link POINT_SELECTION_PIXEL_RADIUS} of the click, or `null`. */
  private findPointAtPixel(layout: PlotLayout, x: number, y: number): number | null {
    let nearestIndex: number | null = null;
    let nearestDistance = POINT_SELECTION_PIXEL_RADIUS;
    this.floorFormService.pointsView().forEach(({ group }, index) => {
      const distance = group.controls.distanceToRefSupport.value;
      const altitude = group.controls.altitude.value;
      if (distance === null || altitude === null) return;
      const pixelDistance = Math.hypot(layout.xaxis.c2p(distance) - x, layout.yaxis.c2p(altitude) - y);
      if (pixelDistance <= nearestDistance) {
        nearestDistance = pixelDistance;
        nearestIndex = index;
      }
    });
    return nearestIndex;
  }

  private updateSelectedPositionMarkers(): void {
    const plot = this.plot();
    if (!plot) return;
    void Plotly.relayout(plot, { annotations: this.getAnnotations() });
  }

  private getAnnotations(): PlotAnnotation[] {
    const activeIndex = this.floorFormService.activePointIndex();
    return this.floorFormService
      .pointsView()
      .map(({ group }, index): PlotAnnotation | null => {
        const distance = group.controls.distanceToRefSupport.value;
        const altitude = group.controls.altitude.value;
        if (distance === null || altitude === null) return null;
        return {
          x: distance,
          y: altitude,
          text: '+',
          showarrow: false,
          font: {
            size: 30,
            color: index === activeIndex ? 'red' : 'black'
          }
        };
      })
      .filter((annotation): annotation is PlotAnnotation => annotation !== null);
  }

  // The plot container is a static template element that survives Plotly.purge(), so listeners
  // must be removed on every recreation — otherwise each refresh adds another click handler.
  private attachEventListeners(plotElement: PlotElement | null): void {
    if (!plotElement) return;

    const onMouseMove = (evt: MouseEvent) => {
      this.handleMouseMove(evt, plotElement);
    };
    const onClick = (evt: MouseEvent) => {
      this.handleClick(evt, plotElement);
    };

    plotElement.addEventListener('mousemove', onMouseMove);
    plotElement.addEventListener('click', onClick);

    this.detachEventListeners = () => {
      plotElement.removeEventListener('mousemove', onMouseMove);
      plotElement.removeEventListener('click', onClick);
    };
  }

  /**
   * Re-expresses the engine's coordinates as distances to the floor's reference support, so the
   * drawn span shares the frame the form's points, its annotations and the clicks it saves use.
   * `null` when the span's supports aren't in the output (nothing plottable then).
   */
  private toReferenceSupportFrame(litData: GetSectionOutput, spanIndex: number): GetSectionOutput | null {
    const { coords } = litData;
    const fromRight = this.floorFormService.referenceSupportValue() === 'RIGHT';
    // Support feet: the first point of a support polyline, the only one on the support axis (the
    // ones above it carry the crossarm's lateral offset).
    const origin = coords?.supports?.[fromRight ? spanIndex + 1 : spanIndex]?.[0];
    const target = coords?.supports?.[fromRight ? spanIndex : spanIndex + 1]?.[0];
    if (!origin || !target) {
      return null;
    }
    return {
      ...litData,
      coords: {
        ...coords,
        spans: projectOnSpanAxis(coords.spans, origin, target),
        supports: projectOnSpanAxis(coords.supports, origin, target),
        insulators: projectOnSpanAxis(coords.insulators, origin, target)
      }
    };
  }

  async createPlot(litData: GetSectionOutput, selectedSpan: number, supports: Support[]): Promise<void> {
    try {
      const framedLitData = this.toReferenceSupportFrame(litData, selectedSpan);
      if (!framedLitData) {
        return;
      }

      const plotData = createPlotData(
        framedLitData,
        {
          view: '2d',
          side: 'profile',
          startSupport: selectedSpan,
          endSupport: selectedSpan + 1,
          invert: false
        },
        supports
      );

      if (!plotData) {
        return;
      }

      const plotElement = document.getElementById(FLOOR_FREE_POSITIONING_PLOT_ID) as PlotElement | null;
      if (!plotElement) {
        this.logger.warn(`Plot element not found: ${FLOOR_FREE_POSITIONING_PLOT_ID}`);
        return;
      }

      const plot = await Plotly.newPlot(
        FLOOR_FREE_POSITIONING_PLOT_ID,
        plotData,
        { ...getFloorFreePositioningPlotLayout(), annotations: this.getAnnotations() },
        getFloorFreePositioningPlotConfig()
      );
      // Destroyed while newPlot was in flight: the container id is global, so a newly mounted
      // instance may already own it — publishing this plot would attach listeners to its element.
      if (this.destroyed) {
        return;
      }
      this.attachEventListeners(plotElement);
      this.plot.set(plot);
    } catch (error) {
      this.logger.error('Error creating floor free-positioning plot:', error);
    }
  }

  ngOnDestroy(): void {
    // Safety net: always leave the mode when this component is destroyed
    this.destroyed = true;
    this.recreatePlot.cancel();
    this.debounceUpdateSelectedPositionMarkers.cancel();
    this.plotOptionsService.setFreePositioningMode(false, 'floor');
    this.destroyPlot();
  }
}
