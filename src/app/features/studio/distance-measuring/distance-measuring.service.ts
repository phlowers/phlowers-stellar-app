/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { v4 as uuidv4 } from 'uuid';
import { TranslocoService } from '@jsverse/transloco';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { NotificationService } from '@services/notification/notification.service';
import { Task, MeasurePointGroup } from '@services/worker_python/tasks/types';
import { Position3D } from '@shared/domain/models/obstacle.model';
import { PositionFormGroup } from '@shared/domain/obstacles/obstacle-form.interfaces';
import { POINT_COUNT } from './distance-measuring.constants';
import { DistanceMeasuringResults } from './distance-measuring.model';

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
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);

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

  /**
   * True once a span is selected and points 1 and 2 have all three coordinates filled in
   * (point 3 is optional).
   */
  readonly canCalculate = computed(() => {
    const supportUuid = this.selectedSupportUuid();
    if (!supportUuid || this.spanService.getSupportIndex(supportUuid) < 0) {
      return false;
    }
    return this.positions()
      .slice(0, 2)
      .every((point) => this.isPointFilled(point));
  });

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
  async reset(): Promise<void> {
    this.form.controls.forEach((group) => group.reset(this.emptyPosition));
    this.activePointIndex.set(0);
    this.results.set(null);
    if (!this.workerPythonService.ready) {
      return;
    }
    await this.workerPythonService.runTask(Task.clearMeasureDistanceAnglePoints, undefined);
    await this.plotService.refreshProjection();
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
   * Computes the distances and angle between the two or three points.
   *
   * @remarks
   * `z` (`Point alt.`) is absolute and  `x` (`Ref. support dist.`) is relative to the
   * span's left support, so `altitudeType` is fixed to `absolute`, `lateralDistanceType`
   * to `SPAN_AXIS`, and `referenceSupport` to `LEFT`.
   */
  async calculate(): Promise<void> {
    if (!this.canCalculate() || this.isCalculating()) {
      return;
    }
    const supportUuid = this.selectedSupportUuid();
    const supportIndex = supportUuid ? this.spanService.getSupportIndex(supportUuid) : -1;
    if (!supportUuid || supportIndex < 0) {
      return;
    }
    this.isCalculating.set(true);
    this.results.set(null);
    try {
      const positions = this.positions()
        .filter((point) => this.isPointFilled(point))
        .map((point) => ({ x: point.x as number, y: point.y as number, z: point.z as number }));
      const { startSupport, endSupport, view } = this.plotOptionsService.plotOptions();

      const points: [MeasurePointGroup] = [
        {
          uuid: uuidv4(),
          supportUuid,
          supportIndex,
          name: 'Distance measurement',
          type: 'distance_measurement_points',
          altitudeType: 'absolute',
          lateralDistanceType: 'SPAN_AXIS',
          referenceSupport: 'LEFT',
          positions
        }
      ];

      const { error: addPointsError } = await this.workerPythonService.runTask(Task.addMeasureDistanceAnglePoints, {
        points,
        supportIndex,
        startSupport,
        endSupport,
        view
      });

      if (addPointsError) {
        this.notificationService.error(
          this.translocoService.translate('studio.distance-measuring.add-measurement-points-error')
        );
        return;
      }

      const { result, error } = await this.workerPythonService.runTask(Task.measureDistance, {
        points,
        supportIndex,
        startSupport,
        endSupport,
        view
      });

      if (!error && result) {
        this.results.set({
          distance12: result.distance_1_2,
          distance23: result.distance_2_3,
          angle123: result.angle_1_2_3
        });
      }

      await this.plotService.refreshProjection();
    } finally {
      this.isCalculating.set(false);
    }
  }
}
