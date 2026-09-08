/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  Signal,
  untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import Plotly, { ModeBarButtonAny, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { Options } from '@angular-slider/ngx-slider';
import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { Side } from '@shared/types/plot.types';
import { GetSectionOutput } from '@core/services/worker_python/tasks/types';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { formatStudioError } from '@shared/components/studio/helpers/errors';
import { Support } from '@shared/domain';
import { debounce, isNumber } from 'lodash';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { PLOT_AXIS_CONFIG } from '@shared/components/studio/section/helpers/plot.constants';
import { LoggerService } from '@core/services/logger/logger.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

// Constants
const PLOT_CONFIG = {
  HEIGHT: 500,
  MARGIN_LEFT: 35,
  MARGIN_RIGHT: 0,
  MARGIN_TOP: 0,
  MARGIN_BOTTOM: 35,
  SHAPE_EXTENT: 1000,
  PLOT_CREATION_DELAY_MS: 300,
  MARKER_DELTA: 5
} as const;

export const DEBOUNCED_REFRESH_STUDIO_DELAY = 400;
export const DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY = 100;
const PLOT_IDS = {
  FACE: 'plotly-output-single-span-face-2',
  PROFILE: 'plotly-output-single-span-profile-2'
} as const;

interface MousePosition {
  x: string;
  z: string;
}

interface PlotLayout {
  margin: {
    l: number;
    r: number;
    t: number;
    b: number;
  };
  xaxis: {
    p2c: (value: number) => number;
  };
  yaxis: {
    p2c: (value: number) => number;
  };
}

interface PlotAnnotation {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  arrowhead?: number;
  standoff?: number;
  yshift?: number;
  font?: {
    color?: string;
    size?: number;
  };
}

interface PlotElement extends HTMLElement {
  _fullLayout?: PlotLayout;
}

@Component({
  selector: 'app-free-positioning',
  standalone: true,
  imports: [FormsModule, DialogModule, InputNumberModule, ProgressSpinnerModule, TranslocoModule],
  templateUrl: './free-positioning.component.html',
  styleUrl: './free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreePositioningComponent implements OnDestroy {
  isLoading = signal<boolean>(true);

  readonly referenceSupportAltitudeNgf = signal<number>(0);
  readonly sharedYRange = signal<[number, number] | null>(null);

  // State
  options = signal<Options>({});
  plotFace = signal<PlotlyHTMLElement | null>(null);
  plotProfile = signal<PlotlyHTMLElement | null>(null);

  private readonly detachEventListeners = new Map<Side, () => void>();
  profileMousePosition = signal<MousePosition | null>(null);
  faceMousePosition = signal<MousePosition | null>(null);

  getErrorString = computed(() => {
    const exceptionDiagnostic = this.plotService.diagnostics().find((diagnostic) => diagnostic.origin === 'exception');
    return formatStudioError(this.plotService.error(), this.translocoService, exceptionDiagnostic?.code ?? null);
  });

  // Dependencies
  readonly plotService = inject(PlotService);
  private readonly translocoService = inject(TranslocoService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  readonly sideTabsService = inject(SideTabsService);
  readonly obstacleFormService = inject(ObstacleFormService);
  readonly obstaclesService = inject(ObstaclesService);
  private readonly logger = inject(LoggerService);
  private readonly positionsValue: Signal<unknown>;

  constructor() {
    this.positionsValue = toSignal(this.obstacleFormService.form.get('positions')?.valueChanges ?? of([]), {
      initialValue: this.obstacleFormService.form.get('positions')?.value ?? []
    });

    effect(() => {
      const plotOptions = this.plotOptionsService.plotOptions();
      const workerReady = this.plotService.workerReady();
      const litData = this.plotService.litData();

      if (workerReady && litData && plotOptions) {
        untracked(() => this.recreatePlots());
      }
    });

    effect(() => {
      this.sideTabsService.sideTabs();

      untracked(() => {
        setTimeout(() => {
          this.relayoutPlots();
        }, DEBOUNCED_REFRESH_STUDIO_DELAY);
      });
    });

    effect(() => {
      this.obstaclesService.activePointIndex();
      this.positionsValue();

      untracked(() => this.debounceUpdateSelectedPositionMarkers());
    });
  }

  recreatePlots = debounce(async () => {
    this.destroyAllPlots();
    const startSupport = this.plotOptionsService.plotOptions().startSupport;
    this.isLoading.set(true);

    const currentLitData = this.plotService.litData();
    if (!currentLitData) {
      this.isLoading.set(false);
      return;
    }

    const referenceSupportValue = this.obstacleFormService.form.get('referenceSupport')?.value as
      ReferenceSupport | undefined;
    const referenceSupportIndex = referenceSupportValue === ReferenceSupport.RIGHT ? startSupport + 1 : startSupport;
    this.referenceSupportAltitudeNgf.set(this.getSupportAltitudeNgf(currentLitData, referenceSupportIndex));

    const supports = this.spanService.section()?.supports ?? [];
    this.sharedYRange.set(null);
    await this.createPlot(currentLitData, startSupport, 'face', supports);
    await this.createPlot(currentLitData, startSupport, 'profile', supports);
    this.synchronizeYAxisRanges();
    this.isLoading.set(false);
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  private getSupportAltitudeNgf(litData: GetSectionOutput, supportIndex: number): number {
    const supportPoints = litData?.coords.supports?.[supportIndex];
    const firstPoint = supportPoints?.[0];
    const altitude = Array.isArray(firstPoint) ? firstPoint[2] : undefined;
    return typeof altitude === 'number' && !Number.isNaN(altitude) ? altitude : 0;
  }

  private isAbsoluteAltitudeMode(): boolean {
    return this.obstacleFormService.form.get('altitudeType')?.value === 'absolute';
  }

  debounceUpdateSelectedPositionMarkers = debounce(() => {
    this.updateSelectedPositionMarkers();
  }, DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY);

  relayoutPlots(): void {
    const facePlot = this.plotFace();
    const profilePlot = this.plotProfile();
    if (facePlot) {
      Plotly.relayout(facePlot, this.getPlotLayout());
    }
    if (profilePlot) {
      Plotly.relayout(profilePlot, this.getPlotLayout());
    }
  }

  /**
   * Destroys all plot instances
   */
  private destroyAllPlots(): void {
    this.detachEventListeners.forEach((detach) => detach());
    this.detachEventListeners.clear();

    const facePlot = this.plotFace();
    const profilePlot = this.plotProfile();

    if (facePlot) {
      Plotly.purge(facePlot);
      this.plotFace.set(null);
    }

    if (profilePlot) {
      Plotly.purge(profilePlot);
      this.plotProfile.set(null);
    }
  }

  /**
   * Extracts all finite Y values from a plot's traces.
   */
  private extractYValues(plot: PlotlyHTMLElement): number[] {
    return plot.data
      .flatMap((trace) => {
        const y = (trace as Plotly.ScatterData).y;
        if (y == null) return [];
        return Array.from(y as ArrayLike<number>);
      })
      .filter((v) => typeof v === 'number' && Number.isFinite(v));
  }

  /**
   * Computes a padded [min, max] range from an array of Y values.
   * Returns null if the array is empty.
   */
  private computePaddedYRange(yValues: number[]): [number, number] | null {
    if (yValues.length === 0) return null;

    let minY = Infinity;
    let maxY = -Infinity;
    for (const v of yValues) {
      if (v < minY) minY = v;
      if (v > maxY) maxY = v;
    }
    const padding = Math.max((maxY - minY) * 0.05, 1);
    return [minY - padding, maxY + padding];
  }

  /**
   * Applies a shared Y axis range to the given plots.
   */
  private applySharedYRange(plots: PlotlyHTMLElement[], range: [number, number]): void {
    for (const plot of plots) {
      void Plotly.relayout(plot, { 'yaxis.range': range, 'yaxis.autorange': false });
    }
  }

  /**
   * Synchronizes the Y axis range between face and profile plots
   * so that both charts share the exact same vertical scale.
   */
  private synchronizeYAxisRanges(): void {
    const facePlot = this.plotFace();
    const profilePlot = this.plotProfile();
    if (!facePlot || !profilePlot) return;

    const allYValues = [...this.extractYValues(facePlot), ...this.extractYValues(profilePlot)];
    const sharedRange = this.computePaddedYRange(allYValues);
    if (!sharedRange) return;

    this.sharedYRange.set(sharedRange);
    this.applySharedYRange([facePlot, profilePlot], sharedRange);
  }

  /**
   * Creates plot layout configuration
   */
  private getPlotLayout(): Partial<Plotly.Layout> {
    const sharedRange = this.sharedYRange();

    return {
      autosize: true,
      showlegend: false,
      dragmode: 'pan',
      margin: {
        l: PLOT_CONFIG.MARGIN_LEFT,
        r: PLOT_CONFIG.MARGIN_RIGHT,
        t: PLOT_CONFIG.MARGIN_TOP,
        b: PLOT_CONFIG.MARGIN_BOTTOM
      },
      yaxis: {
        ...PLOT_AXIS_CONFIG,
        showticklabels: true,
        showgrid: true,
        showline: true,
        ...(sharedRange ? { range: [...sharedRange], autorange: false } : {})
      },
      xaxis: {
        ...PLOT_AXIS_CONFIG,
        showticklabels: true,
        showgrid: true,
        showline: true
      }
    };
  }

  /**
   * Creates plot configuration options
   */
  private getPlotConfig(): Partial<Plotly.Config> {
    return {
      displayModeBar: true,
      fillFrame: false,
      responsive: true,
      autosizable: true,
      displaylogo: false,
      modeBarButtons: [['zoomIn2d', 'zoomOut2d']] as ModeBarButtonAny[][]
    };
  }

  /**
   * Handles mouse move event for plot interaction
   */
  private handleMouseMove(evt: MouseEvent, type: Side, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout) return;

    const x = evt.layerX - layout.margin.l;
    const y = evt.layerY - layout.margin.t;

    this.updateMousePosition(type, layout, x, y);
  }

  /**
   * Updates mouse position display
   */
  private updateMousePosition(type: Side, layout: PlotLayout, x: number, y: number): void {
    const position: MousePosition = {
      x: Number(layout.xaxis.p2c(x)).toFixed(2),
      z: Number(layout.yaxis.p2c(y)).toFixed(2)
    };

    if (type === 'profile') {
      this.profileMousePosition.set(position);
    } else {
      this.faceMousePosition.set(position);
    }
  }

  /**
   * Handles click event for obstacle placement
   */
  private handleClick(evt: MouseEvent, type: Side, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout) return;

    const x = evt.layerX - layout.margin.l;
    const y = evt.layerY - layout.margin.t;
    const plotWidth = plotElement.clientWidth - layout.margin.l - layout.margin.r;
    const plotHeight = plotElement.clientHeight - layout.margin.t - layout.margin.b;
    if (x < 0 || x > plotWidth || y < 0 || y > plotHeight) return;

    const previousSelected = this.obstaclesService.activePointIndex();
    if (!isNumber(previousSelected)) return;
    const positions = this.obstacleFormService.positions.value as Position3D[];
    const previousSelectedObstacle = positions.find((_o, index) => index === previousSelected);
    if (!previousSelectedObstacle) return;

    let newObstacle: Position3D;
    if (type === 'profile') {
      // Profile plot: update x and z, keep y
      const clickedAbsoluteAltitude = Number.parseFloat(layout.yaxis.p2c(y).toFixed(2));
      const zValue = this.isAbsoluteAltitudeMode()
        ? clickedAbsoluteAltitude
        : Number.parseFloat((clickedAbsoluteAltitude - this.referenceSupportAltitudeNgf()).toFixed(2));
      newObstacle = {
        x: Number.parseFloat(layout.xaxis.p2c(x).toFixed(2)),
        y: previousSelectedObstacle.y ?? null,
        z: zValue
      };
    } else {
      // Face plot: update y only, keep x and z
      newObstacle = {
        x: previousSelectedObstacle.x ?? null,
        y: Number.parseFloat(layout.xaxis.p2c(x).toFixed(2)),
        z: previousSelectedObstacle.z ?? null
      };
    }

    // Update local selected position immediately for instant UI feedback
    const positionGroup = this.obstacleFormService.positions.at(previousSelected);
    if (positionGroup) {
      positionGroup.patchValue(newObstacle);
    }
  }

  /**
   * Updates the annotations on both plots for the selected position
   */
  private updateSelectedPositionMarkers(): void {
    const obstaclesPoints = this.obstacleFormService.positions.value as Position3D[];
    this.updateMarkerForPlot(this.plotProfile(), 'profile', obstaclesPoints);
    this.updateMarkerForPlot(this.plotFace(), 'face', obstaclesPoints);
  }

  private getAnnotations(obstaclesPoints: Position3D[], side: Side): PlotAnnotation[] {
    const formAnnotations = this.getFormPositionAnnotations(obstaclesPoints, side);
    const existingAnnotations = this.getExistingObstacleAnnotations(side);
    return [...existingAnnotations, ...formAnnotations];
  }

  private getFormPositionAnnotations(obstaclesPoints: Position3D[], side: Side): PlotAnnotation[] {
    const annotations: PlotAnnotation[] = [];
    obstaclesPoints.forEach((position, index) => {
      if (position.x === null || position.z === null) {
        return;
      }
      // In face view, we need y; in profile view, we need x and z
      if (side === 'face' && position.y === null) {
        return;
      }
      const xCoord = side === 'profile' ? position.x : position.y!;
      const yCoord = this.isAbsoluteAltitudeMode() ? position.z : position.z + this.referenceSupportAltitudeNgf();
      annotations.push({
        x: xCoord,
        y: yCoord,
        text: '+',
        showarrow: false,
        arrowhead: 6,
        standoff: 20,
        font: {
          size: 30,
          color: index === this.obstaclesService.activePointIndex() ? 'red' : 'black'
        }
      });
    });
    return annotations;
  }

  /**
   * Creates annotations for existing obstacles from litData.obstacles.
   * Renders each obstacle point as a marker with its name label.
   * Coordinate mapping: profile → (x, z), face → (y, z).
   */
  private getExistingObstacleAnnotations(side: Side): PlotAnnotation[] {
    const litData = this.plotService.litData();
    if (!litData?.obstacles?.length) {
      return [];
    }

    const sectionObstacles = this.spanService.section()?.obstacles ?? [];

    return litData.obstacles.flatMap((litObstacle) => {
      const domainObstacle = sectionObstacles.find((o) => o.uuid === litObstacle.uuid);
      const obstacleName = domainObstacle?.name ?? litObstacle.uuid;

      return litObstacle.points.flatMap(([cx, cy, cz]) => {
        const px = side === 'face' ? cy : cx;
        const py = cz;

        const marker: PlotAnnotation = {
          x: px,
          y: py,
          text: '\u25cf',
          showarrow: false,
          font: { size: 14, color: 'black' }
        };

        const label: PlotAnnotation = {
          x: px,
          y: py,
          text: obstacleName,
          showarrow: false,
          yshift: 12,
          font: { size: 10, color: 'black' }
        };

        return [marker, label];
      });
    });
  }

  /**
   * Updates the annotation on a single plot
   */
  private updateMarkerForPlot(plot: PlotlyHTMLElement | null, side: Side, obstaclesPoints: Position3D[]): void {
    const annotations = this.getAnnotations(obstaclesPoints, side);

    if (!plot) return;

    void Plotly.relayout(plot, { annotations });
  }

  /**
   * Attaches event listeners to the plot
   */
  // The plot containers are static template elements that survive Plotly.purge(), so listeners
  // must be removed on every recreation — otherwise each refresh adds another click handler.
  private attachEventListeners(type: Side, plotElement: PlotElement | null): void {
    if (!plotElement) return;

    const onMouseMove = (evt: MouseEvent) => {
      this.handleMouseMove(evt, type, plotElement);
    };
    const onClick = (evt: MouseEvent) => {
      this.handleClick(evt, type, plotElement);
    };

    plotElement.addEventListener('mousemove', onMouseMove);
    plotElement.addEventListener('click', onClick);

    this.detachEventListeners.set(type, () => {
      plotElement.removeEventListener('mousemove', onMouseMove);
      plotElement.removeEventListener('click', onClick);
    });
  }

  /**
   * Gets the plot ID for a given side
   */
  private getPlotId(side: Side): string {
    return side === 'face' ? PLOT_IDS.FACE : PLOT_IDS.PROFILE;
  }

  /**
   * Creates a plot for the specified span and side
   */
  async createPlot(litData: GetSectionOutput, selectedSpan: number, side: Side, supports: Support[]): Promise<void> {
    try {
      const plotId = this.getPlotId(side);

      if (!litData) {
        return;
      }
      const plotData = createPlotData(
        litData,
        {
          view: '2d',
          side: side,
          startSupport: selectedSpan,
          endSupport: selectedSpan + 1,
          invert: false
        },
        supports
      );

      if (!plotData) {
        return;
      }

      const plotElement = document.getElementById(plotId) as PlotElement | null;
      if (!plotElement) {
        this.logger.warn(`Plot element not found: ${plotId}`);
        return;
      }
      const annotations = this.getAnnotations(
        this.obstacleFormService.form.get('positions')?.value as Position3D[],
        side
      );

      const layout = this.getPlotLayout();
      const config = this.getPlotConfig();

      const plot = await Plotly.newPlot(plotId, plotData, { ...layout, annotations }, config);
      this.attachEventListeners(side, plotElement);
      this.setPlotReference(side, plot);
    } catch (error) {
      this.logger.error(`Error creating plot for ${side}:`, error);
    }
  }

  /**
   * Sets the plot reference based on side
   */
  private setPlotReference(side: Side, plot: PlotlyHTMLElement): void {
    if (side === 'face') {
      this.plotFace.set(plot);
    } else {
      this.plotProfile.set(plot);
    }
  }

  ngOnDestroy(): void {
    // Safety net: always leave the mode when this component is destroyed
    this.plotOptionsService.setFreePositioningMode(false, 'obstacle');
    this.destroyAllPlots();
  }
}
