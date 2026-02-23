/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Component, computed, effect, OnDestroy, signal, Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import Plotly, { ModeBarButtonAny, PlotlyHTMLElement, Shape } from 'plotly.js-dist-min';
import { Options } from '@angular-slider/ngx-slider';
import { createPlotData } from '../section/helpers/createPlotData';
import { Side } from '../section/helpers/types';
import { GetSectionOutput, Task } from '@core/services/worker_python/tasks/types';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import { PlotService } from '@ui/pages/studio/services/plot.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { formatStudioError } from '../helpers/errors';
import { Support } from '@core/index';
import { debounce, isNumber } from 'lodash';
import { SideTabsService } from '@ui/pages/studio/side-tabs/side-tabs.service';
import { ObstacleFormService } from '@src/app/ui/pages/studio/obstacles/obstaclesForm/obstaclesForm.service';
import { ObstaclesService } from '@src/app/ui/pages/studio/obstacles/obstacles.service';
import { Position3D } from '@src/app/core/domain/models/obstacle.model';

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

const AXIS_CONFIG = {
  backgroundcolor: 'gainsboro',
  gridcolor: 'dimgray',
  showbackground: true
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

export interface PlotAnnotation {
  x: number;
  y: number;
  text: string;
  showarrow: boolean;
  arrowhead: number;
  standoff: number;
  font?: {
    color?: string;
    size?: number;
  };
}

interface PlotLayoutWithExtras extends PlotLayout {
  shapes?: Partial<Shape>[];
  annotations?: PlotAnnotation[];
}

interface PlotElement extends HTMLElement {
  _fullLayout?: PlotLayout;
}

@Component({
  selector: 'app-free-positioning',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, InputNumberModule, ProgressSpinnerModule],
  templateUrl: './free-positioning.component.html',
  styleUrl: './free-positioning.component.scss'
})
export class FreePositioningComponent implements OnDestroy {
  isLoading = signal<boolean>(true);

  // State
  options = signal<Options>({});
  plotFace = signal<PlotlyHTMLElement | null>(null);
  plotProfile = signal<PlotlyHTMLElement | null>(null);
  profileMousePosition = signal<MousePosition | null>(null);
  faceMousePosition = signal<MousePosition | null>(null);

  getErrorString = computed(() => {
    return formatStudioError(this.plotService.error());
  });

  // Dependencies
  private readonly positionsValue: Signal<unknown>;

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    public readonly plotService: PlotService,
    public readonly sideTabsService: SideTabsService,
    public readonly obstacleFormService: ObstacleFormService,
    public readonly obstaclesService: ObstaclesService
  ) {
    this.positionsValue = toSignal(
      this.obstacleFormService.form.get('positions')?.valueChanges ?? of([]),
      { initialValue: this.obstacleFormService.form.get('positions')?.value ?? [] }
    );

    effect(() => {
      const plotOptions = this.plotService.plotOptions();
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
      this.obstaclesService.currentPointIndex();
      this.positionsValue();

      untracked(() => this.debounceUpdateSelectedPositionMarkers());
    });
  }

  recreatePlots = debounce(async () => {
    this.destroyAllPlots();
    const startSupport = this.plotService.plotOptions().startSupport;
    this.isLoading.set(true);
    const litData = await this.workerPythonService.runTask(Task.refreshProjection, {
      startSupport: startSupport,
      endSupport: startSupport + 1,
      view: '2d'
    });
    const supports = this.plotService.section()?.supports ?? [];
    await this.createPlot(litData.result.current, startSupport, 'face', supports);
    await this.createPlot(litData.result.current, startSupport, 'profile', supports);
    this.isLoading.set(false);
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  debounceUpdateSelectedPositionMarkers = debounce(() => {
    this.updateSelectedPositionMarkers();
  }, DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY);

  relayoutPlots(): void {
    const facePlot = this.plotFace();
    const profilePlot = this.plotProfile();
    if (facePlot) {
      Plotly.relayout(facePlot, this.getPlotLayout('face'));
    }
    if (profilePlot) {
      Plotly.relayout(profilePlot, this.getPlotLayout('profile'));
    }
  }

  /**
   * Destroys all plot instances
   */
  private destroyAllPlots(): void {
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
   * Creates plot layout configuration
   */
  private getPlotLayout(side: Side): Partial<Plotly.Layout> {
    const isFaceView = side === 'face';

    return {
      // autosize: true,
      // height: PLOT_CONFIG.HEIGHT,
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
        ...AXIS_CONFIG,
        scaleratio: isFaceView ? 0.2 : undefined,
        scaleanchor: isFaceView ? 'x' : undefined,
        showticklabels: true,
        showgrid: true,
        showline: true
      },
      xaxis: {
        ...AXIS_CONFIG,
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
    // TODO: try to find another way to detect if the click not on the background
    if (!(evt.target as any)?.className?.baseVal?.includes('drag') && (evt.target as any).tagName !== 'CANVAS') {
      return;
    }

    const previousSelected = this.obstaclesService.currentPointIndex();
    if (!isNumber(previousSelected)) return;
    const positions = this.obstacleFormService.positions.value as Position3D[];
    const previousSelectedObstacle = positions.find((o, index) => index === previousSelected);
    if (!previousSelectedObstacle) return;
    const newObstacle: Position3D =
      type === 'profile'
        ? {
            // First plot (profile): update x and z, keep y
            x: parseFloat(layout.xaxis.p2c(x).toFixed(2)),
            y: previousSelectedObstacle.y ?? null,
            z: parseFloat(layout.yaxis.p2c(y).toFixed(2))
          }
        : {
            // Second plot (face): update y, keep x and z
            x: previousSelectedObstacle.x ?? null,
            y: parseFloat(layout.xaxis.p2c(x).toFixed(2)),
            z: previousSelectedObstacle.z ?? null
          };

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
      const yCoord = position.z;
      annotations.push({
        x: xCoord,
        y: yCoord,
        text: '+',
        showarrow: false,
        arrowhead: 6,
        standoff: 20,
        font: {
          size: 30,
          color: index === this.obstaclesService.currentPointIndex() ? 'red' : 'black'
        }
      });
    });
    return annotations;
  }

  /**
   * Updates the annotation on a single plot
   */
  private updateMarkerForPlot(plot: PlotlyHTMLElement | null, side: Side, obstaclesPoints: Position3D[]): void {
    const annotations = this.getAnnotations(obstaclesPoints, side);

    if (!plot) return;
    const layoutWithExtras = (plot as PlotElement)._fullLayout as PlotLayoutWithExtras;
    if (!layoutWithExtras) return;

    const pLayout = this.getPlotLayout(side);
    void Plotly.update(
      plot,
      {},
      {
        ...pLayout,
        annotations
      }
    );
  }

  /**
   * Attaches event listeners to the plot
   */
  private attachEventListeners(type: Side, plotElement: PlotElement | null): void {
    if (!plotElement) return;

    plotElement.addEventListener('mousemove', (evt) => {
      this.handleMouseMove(evt, type, plotElement);
    });

    plotElement.addEventListener('click', (evt) => {
      this.handleClick(evt, type, plotElement);
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
        console.warn(`Plot element not found: ${plotId}`);
        return;
      }
      const annotations = this.getAnnotations(
        this.obstacleFormService.form.get('positions')?.value as Position3D[],
        side
      );

      // const width = plotElement.clientWidth;
      const layout = this.getPlotLayout(side);
      const config = this.getPlotConfig();

      const plot = await Plotly.newPlot(plotId, plotData, { ...layout, annotations }, config);
      this.attachEventListeners(side, plotElement);
      this.setPlotReference(side, plot);
    } catch (error) {
      console.error(`Error creating plot for ${side}:`, error);
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
    this.destroyAllPlots();
  }
}
