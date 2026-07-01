/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { Position3D } from '@shared/domain/models/obstacle.model';
import { PositionFormGroup } from '@shared/domain/obstacles/obstacle-form.interfaces';

/** Number of points handled by the distance-measuring tool. */
const POINT_COUNT = 3;

/** Results of a distance/angle measurement between the three points. */
export interface DistanceMeasuringResults {
  /** Distance between point 1 and point 2 (meters). */
  distance12: number;
  /** Distance between point 2 and point 3 (meters), null when point 3 is not filled in. */
  distance23: number | null;
  /** Angle at point 2 formed by points 1-2-3 (degrees), null when point 3 is not filled in. */
  angle123: number | null;
}

/**
 * Holds the ephemeral state of the distance-measuring tool (span selection,
 * three editable points, and the mocked distance/angle results).
 *
 * @remarks
 * This tool is intentionally not persisted: there is no domain model and no save.
 * `Point alt.` (`z`) and `Ref. support dist.` (`x`) are expressed relative to the
 * span's left support.
 *
 * Free positioning (driving the points from the plot) is temporarily disabled
 * while the free-positioning component is being reworked on another branch.
 *
 * @category Services
 */
@Injectable({
  providedIn: 'root'
})
export class DistanceMeasuringService {
  private readonly fb = inject(FormBuilder);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);
  private readonly plotOptionsService = inject(PlotOptionsService);

  private readonly emptyPosition = { x: null, y: null, z: null } as const satisfies Position3D;

  /** Reactive form holding the three editable points. */
  readonly form: FormArray<PositionFormGroup> = this.fb.array(
    Array.from({ length: POINT_COUNT }, () => this.createPointGroup())
  );

  // --- Points ---
  readonly positions = toSignal(this.form.valueChanges, {
    initialValue: this.form.value
  }) as Signal<Position3D[]>;

  readonly activePointIndex = signal<number | null>(0);

  // --- Span selection ---
  readonly selectedSupportUuid = signal<string | null>(null);
  readonly spanOptions = computed(() => this.spanService.getSpanOptions());

  // --- Results / calculation ---
  readonly isCalculating = signal(false);
  readonly results = signal<DistanceMeasuringResults | null>(null);

  /** True once points 1 and 2 have all three coordinates filled in (point 3 is optional). */
  readonly canCalculate = computed(() => this.positions().slice(0, 2).every((point) => this.isPointFilled(point)));

  private isPointFilled(point: Position3D): boolean {
    return point.x !== null && point.y !== null && point.z !== null;
  }

  private createPointGroup(): PositionFormGroup {
    return this.fb.group({
      x: new FormControl<number | null>(this.emptyPosition.x),
      y: new FormControl<number | null>(this.emptyPosition.y),
      z: new FormControl<number | null>(this.emptyPosition.z)
    });
  }

  /** Sets the point that the plot click should edit and highlight. */
  setActivePoint(index: number): void {
    this.activePointIndex.set(index);
  }

  /** Resets every point to empty and clears the results. */
  reset(): void {
    this.form.controls.forEach((group) => group.reset(this.emptyPosition));
    this.activePointIndex.set(0);
    this.results.set(null);
  }

  /** Zooms the plot onto the currently selected span (does not run on span change). */
  zoomToSpan(): void {
    const supportUuid = this.selectedSupportUuid();
    if (!supportUuid) {
      return;
    }
    const supportIndex = this.spanService.getSupportIndex(supportUuid);
    if (supportIndex < 0) {
      return;
    }
    this.plotOptionsService.camera.set(null);
    this.plotService.plotOptionsChange({
      startSupport: supportIndex,
      endSupport: supportIndex + 1
    });
    this.spanService.spanAmountChoice.set('single');
  }

  /**
   * Computes the distances and angle between the three points.
   *
   * @remarks
   * Mocked for now — the Python task is not available yet. When it lands, wire it
   * here following the `papoto` / `temperature-calculation` pattern
   * (`workerPythonService.runTask(...)` inside the try/finally).
   */
  async calculate(): Promise<void> {
    if (!this.canCalculate() || this.isCalculating()) {
      return;
    }
    this.isCalculating.set(true);
    this.results.set(null);
    try {
      // Mocked result — replace with workerPythonService.runTask(Task.<distanceMeasuring>,
      // { points: this.positions() }) once the Python task is available.
      await new Promise((resolve) => setTimeout(resolve, 600));
      const hasThirdPoint = this.isPointFilled(this.positions()[2]);
      this.results.set({
        distance12: 0,
        distance23: hasThirdPoint ? 0 : null,
        angle123: hasThirdPoint ? 0 : null
      });
      console.log({ supportUuid: this.selectedSupportUuid(), positions: this.positions() });

      await this.plotService.refreshProjection();
    } finally {
      this.isCalculating.set(false);
    }
  }
}
