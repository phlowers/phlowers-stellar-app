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
  input,
  OnDestroy,
  output,
  signal,
  untracked
} from '@angular/core';
import { debounce } from 'lodash';
import Plotly, { Data, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { createPlotData } from '@shared/components/studio/section/helpers/createPlotData';
import { formatStudioError } from '@shared/components/studio/helpers/errors';
import { Side } from '@shared/types/plot.types';
import { LoggerService } from '@core/services/logger/logger.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { SideTabsService } from '@services/side-tabs/side-tabs.service';

import {
  buildFreePositioningTraces,
  findNearestPointAtPixel
} from '../free-positioning/free-positioning-traces.helpers';
import {
  CATEGORY_COLORS,
  CORE_PLOT_IDS,
  DEBOUNCED_REFRESH_STUDIO_DELAY,
  DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY,
  DEFAULT_VISIBLE_CATEGORIES,
  FREE_POSITIONING_CATEGORIES,
  getFreePositioningPlotConfig,
  getFreePositioningPlotLayout,
  POINT_SELECTION_PIXEL_RADIUS
} from './free-positioning-plot.constantes';
import {
  applySharedYRange,
  attachPlotEventListeners,
  computePaddedYRange,
  extractYValues,
  getPixelOffset,
  isOutsidePlotBounds,
  toMousePosition
} from './free-positioning-plot.helpers';
import {
  FreePositioningCategory,
  FreePositioningConfig,
  FreePositioningPlacement,
  FreePositioningPoint,
  FreePositioningSelection,
  MousePosition,
  PlotElement
} from './free-positioning-plot.interfaces';

@Component({
  selector: 'app-free-positioning-plot',
  standalone: true,
  imports: [ProgressSpinnerModule, TranslocoModule, ButtonComponent],
  templateUrl: './free-positioning-plot.component.html',
  styleUrl: './free-positioning-plot.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreePositioningPlotComponent implements OnDestroy {
  // Inputs & Outputs
  readonly points = input<FreePositioningPoint[]>([]);
  readonly config = input<FreePositioningConfig>({
    showFace: false,
    editableCategory: 'obstacle'
  });
  readonly spanIndex = input<number | null>(null);

  readonly placement = output<FreePositioningPlacement>();
  readonly selection = output<FreePositioningSelection>();

  // Injected services
  readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly sideTabsService = inject(SideTabsService);
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);

  // Constants exposed to template
  readonly categories = FREE_POSITIONING_CATEGORIES;
  readonly categoryColors = CATEGORY_COLORS;
  readonly plotIds = CORE_PLOT_IDS;

  // State signals
  readonly isLoading = signal<boolean>(true);
  readonly plotProfile = signal<PlotlyHTMLElement | null>(null);
  readonly plotFace = signal<PlotlyHTMLElement | null>(null);
  readonly sharedYRange = signal<[number, number] | null>(null);
  readonly profileMousePosition = signal<MousePosition | null>(null);
  readonly faceMousePosition = signal<MousePosition | null>(null);
  readonly visibleCategories = signal<Set<FreePositioningCategory>>(new Set(DEFAULT_VISIBLE_CATEGORIES));

  private readonly detachEventListeners = new Map<Side, () => void>();

  // Incremented on every destroy/recreation: any async plot creation started under a
  // previous generation is discarded instead of publishing a stale plot.
  private plotGeneration = 0;

  readonly getErrorString = computed(() => {
    const exceptionDiagnostic = this.plotService.diagnostics().find((diagnostic) => diagnostic.origin === 'exception');
    return formatStudioError(this.plotService.error(), this.translocoService, exceptionDiagnostic?.code ?? null);
  });

  constructor() {
    // Initialize visible categories from config when config changes
    effect(() => {
      const cfg = this.config();
      const initial = cfg.defaultVisibleCategories ?? [cfg.editableCategory];
      this.visibleCategories.set(new Set(initial));
    });

    // Recreate plot geometry when worker data or span or face configuration changes
    effect(() => {
      const workerReady = this.plotService.workerReady();
      const litData = this.plotService.litData();
      const span = this.effectiveSpanIndex();
      this.config();

      if (workerReady && litData && span !== null) {
        untracked(() => {
          this.recreatePlots();
        });
      }
    });

    // Update traces when points or category visibility changes
    effect(() => {
      this.points();
      this.visibleCategories();

      untracked(() => {
        this.debounceUpdateTraces();
      });
    });

    // Relayout plots on side-tab resize
    effect(() => {
      this.sideTabsService.sideTabs();

      untracked(() => {
        setTimeout(() => {
          this.relayoutPlots();
        }, DEBOUNCED_REFRESH_STUDIO_DELAY);
      });
    });
  }

  toggleCategory(category: FreePositioningCategory): void {
    this.visibleCategories.update((current) => {
      const next = new Set(current);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  private effectiveSpanIndex(): number | null {
    const explicit = this.spanIndex();
    if (explicit !== null && explicit !== undefined) {
      return explicit;
    }
    return this.plotOptionsService.plotOptions()?.startSupport ?? null;
  }

  recreatePlots = debounce(async () => {
    this.destroyAllPlots();
    // Capture the generation after destroyAllPlots bumped it: a destroy or a newer
    // recreation during the async plot creation invalidates this run.
    const generation = this.plotGeneration;
    const span = this.effectiveSpanIndex();
    this.isLoading.set(true);

    const currentLitData = this.plotService.litData();
    if (!currentLitData || span === null) {
      this.isLoading.set(false);
      return;
    }

    const supports = this.spanService.section()?.supports ?? [];
    this.sharedYRange.set(null);

    await this.createPlot(currentLitData, span, 'profile', supports, generation);
    if (generation !== this.plotGeneration) {
      return;
    }
    if (this.config().showFace) {
      await this.createPlot(currentLitData, span, 'face', supports, generation);
      if (generation !== this.plotGeneration) {
        return;
      }
      this.synchronizeYAxisRanges();
    }
    this.isLoading.set(false);
  }, DEBOUNCED_REFRESH_STUDIO_DELAY);

  debounceUpdateTraces = debounce(() => {
    this.updateTraces();
  }, DEBOUNCED_UPDATE_SELECTED_POSITION_MARKERS_DELAY);

  relayoutPlots(): void {
    const profilePlot = this.plotProfile();
    const facePlot = this.plotFace();
    const layout = getFreePositioningPlotLayout(this.sharedYRange());

    if (profilePlot) {
      void Plotly.relayout(profilePlot, layout);
    }
    if (facePlot) {
      void Plotly.relayout(facePlot, layout);
    }
  }

  private updateTraces(): void {
    const currentLitData = this.plotService.litData();
    const span = this.effectiveSpanIndex();
    const supports = this.spanService.section()?.supports ?? [];

    if (!currentLitData || span === null) {
      return;
    }

    // Resolve the live DOM elements: the chart containers can be unmounted by the
    // template (e.g. while the worker is loading), leaving stale plot signals.
    const profileElement = document.getElementById(this.plotIds.PROFILE);
    if (this.plotProfile() && profileElement) {
      const allTraces = this.buildAllTraces(currentLitData, span, 'profile', supports);
      const layout = getFreePositioningPlotLayout(this.sharedYRange());
      void Plotly.react(profileElement, allTraces, layout, getFreePositioningPlotConfig());
    }

    const faceElement = document.getElementById(this.plotIds.FACE);
    if (this.plotFace() && this.config().showFace && faceElement) {
      const allTraces = this.buildAllTraces(currentLitData, span, 'face', supports);
      const layout = getFreePositioningPlotLayout(this.sharedYRange());
      void Plotly.react(faceElement, allTraces, layout, getFreePositioningPlotConfig());
    }
  }

  private buildAllTraces(
    litData: Parameters<typeof createPlotData>[0],
    span: number,
    side: Side,
    supports: Parameters<typeof createPlotData>[2]
  ): Data[] {
    const sectionTraces =
      createPlotData(
        litData,
        {
          view: '2d',
          side,
          startSupport: span,
          endSupport: span + 1,
          invert: false
        },
        supports
      ) ?? [];

    const categoryTraces = buildFreePositioningTraces(this.points(), side, this.visibleCategories());
    return [...sectionTraces, ...categoryTraces];
  }

  private async createPlot(
    litData: Parameters<typeof createPlotData>[0],
    span: number,
    side: Side,
    supports: Parameters<typeof createPlotData>[2],
    generation: number = this.plotGeneration
  ): Promise<void> {
    const plotId = side === 'face' ? this.plotIds.FACE : this.plotIds.PROFILE;
    const plotElement = document.getElementById(plotId) as PlotElement | null;
    if (!plotElement) {
      this.logger.warn(`Free positioning plot element not found: ${plotId}`);
      return;
    }

    const traces = this.buildAllTraces(litData, span, side, supports);
    const layout = getFreePositioningPlotLayout(this.sharedYRange());
    const config = getFreePositioningPlotConfig();

    try {
      const plot = await Plotly.newPlot(plotId, traces, layout, config);
      if (generation !== this.plotGeneration) {
        // A destroy or a newer recreation happened while newPlot was in flight:
        // discard the stale plot instead of attaching listeners to removed DOM.
        Plotly.purge(plot);
        return;
      }
      this.attachEventListeners(side, plotElement);
      if (side === 'face') {
        this.plotFace.set(plot);
      } else {
        this.plotProfile.set(plot);
      }
    } catch (error) {
      this.logger.error(`Error creating free positioning plot for ${side}:`, error);
    }
  }

  private synchronizeYAxisRanges(): void {
    const facePlot = this.plotFace();
    const profilePlot = this.plotProfile();
    if (!facePlot || !profilePlot) return;

    const allYValues = [...extractYValues(facePlot), ...extractYValues(profilePlot)];
    const sharedRange = computePaddedYRange(allYValues);
    if (!sharedRange) return;

    this.sharedYRange.set(sharedRange);
    applySharedYRange([facePlot, profilePlot], sharedRange);
  }

  private attachEventListeners(side: Side, plotElement: PlotElement | null): void {
    if (!plotElement) return;

    const detach = attachPlotEventListeners(plotElement, {
      onMouseMove: (evt) => this.handleMouseMove(evt, side, plotElement),
      onClick: (evt) => this.handleClick(evt, side, plotElement)
    });
    this.detachEventListeners.set(side, detach);
  }

  private handleMouseMove(evt: MouseEvent, side: Side, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout) return;

    const { x, y } = getPixelOffset(evt, layout);
    const position = toMousePosition(layout, x, y);

    if (side === 'profile') {
      this.profileMousePosition.set(position);
    } else {
      this.faceMousePosition.set(position);
    }
  }

  private handleClick(evt: MouseEvent, side: Side, plotElement: PlotElement | null): void {
    const layout = plotElement?._fullLayout;
    if (!layout || !plotElement) return;

    const { x, y } = getPixelOffset(evt, layout);
    if (isOutsidePlotBounds(x, y, layout, plotElement)) return;

    // Only existing points of the edited category are selectable. Clicking on or near a point
    // from another category (context "other points") falls through to placement, so it injects
    // coordinates into the selected point's fields exactly like clicking empty space.
    const nearestPoint = findNearestPointAtPixel(
      this.points(),
      side,
      layout,
      x,
      y,
      [this.config().editableCategory],
      POINT_SELECTION_PIXEL_RADIUS
    );

    if (nearestPoint && !nearestPoint.editable) {
      this.selection.emit({ point: nearestPoint });
      return;
    }

    // Place a new point or move the active editable point
    if (side === 'profile') {
      const clickedAlongSpan = Number.parseFloat(layout.xaxis.p2c(x).toFixed(1));
      const clickedAltitude = Number.parseFloat(layout.yaxis.p2c(y).toFixed(1));
      this.placement.emit({
        alongSpan: clickedAlongSpan,
        lateral: null,
        altitude: clickedAltitude,
        category: this.config().editableCategory,
        side: 'profile'
      });
    } else {
      const clickedLateral = Number.parseFloat(layout.xaxis.p2c(x).toFixed(1));
      const clickedAltitude = Number.parseFloat(layout.yaxis.p2c(y).toFixed(1));
      this.placement.emit({
        alongSpan: 0,
        lateral: clickedLateral,
        altitude: clickedAltitude,
        category: this.config().editableCategory,
        side: 'face'
      });
    }
  }

  private destroyAllPlots(): void {
    // Invalidate any in-flight async plot creation and cancel pending debounced work
    this.plotGeneration += 1;
    this.debounceUpdateTraces.cancel();
    this.recreatePlots.cancel();

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

  ngOnDestroy(): void {
    this.destroyAllPlots();
  }
}
