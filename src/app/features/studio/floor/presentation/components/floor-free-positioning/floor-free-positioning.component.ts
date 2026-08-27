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
  getFloorFreePositioningPlotLayout
} from './floor-free-positioning.component.constantes';
import { MousePosition, PlotAnnotation, PlotElement } from './floor-free-positioning.component.interfaces';

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

  readonly getErrorString = () => {
    const exceptionDiagnostic = this.plotService.diagnostics().find((diagnostic) => diagnostic.origin === 'exception');
    return formatStudioError(this.plotService.error(), this.translocoService, exceptionDiagnostic?.code ?? null);
  };

  /** Reactive read of `points`, since the FormArray itself isn't a signal — drives the marker-refresh effect below. */
  private readonly pointsValue = toSignal(this.floorFormService.points.valueChanges, {
    initialValue: this.floorFormService.points.value
  });

  /** Recreates the plot whenever the worker output, plot options, or lit data change. */
  private readonly recreatePlotEffect = effect(() => {
    const plotOptions = this.plotOptionsService.plotOptions();
    const workerReady = this.plotService.workerReady();
    const litData = this.plotService.litData();

    if (workerReady && litData && plotOptions) {
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
    const startSupport = this.plotOptionsService.plotOptions().startSupport;
    this.isLoading.set(true);

    const currentLitData = this.plotService.litData();
    if (!currentLitData) {
      this.isLoading.set(false);
      return;
    }

    const supports = this.spanService.section()?.supports ?? [];
    await this.createPlot(currentLitData, startSupport, supports);
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

    const activeIndex = this.floorFormService.activePointIndex();
    if (activeIndex === null || !this.floorFormService.pointsView()[activeIndex]?.meta.removable) return;

    this.floorFormService.setFreePointPosition(activeIndex, {
      distanceToRefSupport: Number.parseFloat(layout.xaxis.p2c(x).toFixed(2)),
      altitude: Number.parseFloat(layout.yaxis.p2c(y).toFixed(2))
    });
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

  private attachEventListeners(plotElement: PlotElement | null): void {
    if (!plotElement) return;

    plotElement.addEventListener('mousemove', (evt) => {
      this.handleMouseMove(evt, plotElement);
    });

    plotElement.addEventListener('click', (evt) => {
      this.handleClick(evt, plotElement);
    });
  }

  async createPlot(litData: GetSectionOutput, selectedSpan: number, supports: Support[]): Promise<void> {
    try {
      const plotData = createPlotData(
        litData,
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
      this.attachEventListeners(plotElement);
      this.plot.set(plot);
    } catch (error) {
      this.logger.error('Error creating floor free-positioning plot:', error);
    }
  }

  ngOnDestroy(): void {
    // Safety net: always leave the mode when this component is destroyed
    this.plotOptionsService.setFreePositioningMode(false, 'floor');
    this.destroyPlot();
  }
}
