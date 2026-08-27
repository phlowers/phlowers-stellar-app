/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { FloorPointFormGroup, FloorPointMeta, SpanSupports, SupportOption } from '@shared/domain/floor/floor-form.interfaces';

/** Service owning the floor tab's reactive form, so both the form UI and the free-positioning plot can share it. */
@Injectable({
  providedIn: 'root'
})
export class FloorFormService {
  private readonly fb = inject(FormBuilder);
  private readonly spanService = inject(PlotSpanService);

  readonly form = this.fb.group({
    span: new FormControl<string | null>(null),
    referenceSupport: new FormControl<'LEFT' | 'RIGHT' | null>({ value: null, disabled: true })
  });

  /** Reactive form array of floor points. Index 0 is the reference support point, last index the closing one, others are free points sorted by distance to ref. support. */
  readonly points: FormArray<FloorPointFormGroup> = this.fb.array([this.createPointGroup(), this.createPointGroup()]);

  readonly activePointIndex = signal<number | null>(null);

  /** Bumped on every structural change to `points` (add/reorder) so `pointsView` recomputes; `points` itself isn't a signal. */
  private readonly pointsVersion = signal(0);

  readonly spanOptions = computed(() => this.spanService.getSpanOptions());
  readonly supportsOptions = signal<SupportOption[]>([]);

  private readonly spanValue = toSignal(this.form.controls.span.valueChanges, {
    initialValue: this.form.controls.span.value
  });

  readonly referenceSupportValue = toSignal(this.form.controls.referenceSupport.valueChanges, {
    initialValue: this.form.controls.referenceSupport.value
  });

  /** The reference and closing supports of the selected span, based on the chosen side. */
  readonly spanSupports = computed<SpanSupports>(() => {
    const spanUuid = this.spanValue();
    const side = this.referenceSupportValue();
    const supports = this.spanService.section()?.supports ?? [];
    const spanIndex = spanUuid ? supports.findIndex((s) => s.uuid === spanUuid) : -1;
    if (!side || spanIndex < 0 || spanIndex >= supports.length - 1) {
      return { reference: null, closing: null, spanLength: null };
    }
    const [left, right] = [supports[spanIndex], supports[spanIndex + 1]];
    const spanLength = left.spanLength;
    return side === 'LEFT' ? { reference: left, closing: right, spanLength } : { reference: right, closing: left, spanLength };
  });

  private readonly pointsMeta = computed<FloorPointMeta[]>(() => {
    this.pointsVersion();
    const { reference, closing } = this.spanSupports();
    const lastIndex = this.points.length - 1;
    return this.points.controls.map((_, index) => {
      if (index === 0) {
        return {
          titleKey: 'studio.floor.reference-support-point-title',
          altitudeReadonly: reference?.supportFootAltitude != null,
          distanceToRefSupportReadonly: true,
          removable: false
        };
      }
      if (index === lastIndex) {
        return {
          titleKey: 'studio.floor.closing-support-point-title',
          altitudeReadonly: closing?.supportFootAltitude != null,
          distanceToRefSupportReadonly: true,
          removable: false
        };
      }
      return {
        titleKey: 'studio.floor.point-title',
        altitudeReadonly: false,
        distanceToRefSupportReadonly: false,
        removable: true
      };
    });
  });

  /** Points combined with their display metadata, for iteration in the template. */
  readonly pointsView = computed(() => {
    const metas = this.pointsMeta();
    return this.points.controls.map((group, index) => ({ group, meta: metas[index] }));
  });

  /** Whether there's at least one free (removable) point — free positioning only makes sense when there's such a point to place. */
  readonly hasEditablePoints = computed(() => {
    this.pointsVersion();
    return this.points.length > 2;
  });

  private readonly spanEffect = effect(() => {
    const supportUuid = this.spanValue();
    if (!supportUuid) {
      this.supportsOptions.set([]);
      this.form.controls.referenceSupport.reset(null, { emitEvent: false });
      this.form.controls.referenceSupport.disable({ emitEvent: false });
      return;
    }
    this.supportsOptions.set(untracked(() => this.spanService.getSupportOptions(supportUuid)));
    this.form.controls.referenceSupport.enable({ emitEvent: false });
  });

  /** Populates point altitudes from support foot altitude, keeps the reference distance to ref. support at 0, and sets the closing distance to ref. support to the span length whenever the resolved supports change. */
  private readonly pointsEffect = effect(() => {
    const { reference, closing, spanLength } = this.spanSupports();
    untracked(() => {
      const controls = this.points.controls;
      const referencePoint = controls[0];
      const closingPoint = controls[controls.length - 1];
      referencePoint.controls.altitude.setValue(reference?.supportFootAltitude ?? null, { emitEvent: false });
      referencePoint.controls.distanceToRefSupport.setValue(0, { emitEvent: false });
      closingPoint.controls.altitude.setValue(closing?.supportFootAltitude ?? null, { emitEvent: false });
      closingPoint.controls.distanceToRefSupport.setValue(spanLength, { emitEvent: false });
      if (!reference && !closing) {
        this.activePointIndex.set(null);
      }
      this.clampMiddlePoints(spanLength);
      this.reorderMiddlePoints();
    });
  });

  private createPointGroup(): FloorPointFormGroup {
    return this.fb.group({
      altitude: new FormControl<number | null>(null),
      distanceToRefSupport: new FormControl<number | null>(null)
    });
  }

  /** Sets the point that the plot click should edit and highlight. */
  setActivePoint(index: number): void {
    this.activePointIndex.set(index);
  }

  /** Formats a point's distance to ref. support for display in its dynamic title. */
  formatDistance(value: number | null): string {
    return value != null ? value.toFixed(2) : '';
  }

  /** Inserts a new, empty free point between the reference and closing points. */
  addPoint(): void {
    const { spanLength } = this.spanSupports();
    if (spanLength == null) {
      return;
    }
    const newGroup = this.createPointGroup();
    this.points.insert(this.points.length - 1, newGroup);
    this.reorderMiddlePoints();
    this.activePointIndex.set(this.points.controls.indexOf(newGroup));
  }

  /** Removes a free point. Reference and closing points cannot be removed. */
  deletePoint(index: number): void {
    if (index <= 0 || index >= this.points.length - 1) {
      return;
    }
    this.points.removeAt(index);
    this.pointsVersion.update((version) => version + 1);
    const activeIndex = this.activePointIndex();
    if (activeIndex === null) {
      return;
    }
    if (activeIndex === index) {
      this.activePointIndex.set(null);
    } else if (activeIndex > index) {
      this.activePointIndex.set(activeIndex - 1);
    }
  }

  /**
   * Sets a free point's altitude and/or distance to ref. support (e.g. from a free-positioning plot click),
   * then clamps and re-sorts the free points. No-op for the reference/closing points.
   */
  setFreePointPosition(index: number, values: { distanceToRefSupport?: number; altitude?: number }): void {
    if (index <= 0 || index >= this.points.length - 1) {
      return;
    }
    const control = this.points.at(index);
    if (values.distanceToRefSupport !== undefined) {
      control.controls.distanceToRefSupport.setValue(values.distanceToRefSupport);
    }
    if (values.altitude !== undefined) {
      control.controls.altitude.setValue(values.altitude);
    }
    this.clampMiddlePoints(this.spanSupports().spanLength);
    this.reorderMiddlePoints();
  }

  /** Clamps every free point's distance to ref. support within [0, spanLength] so it stays between the reference and closing supports. */
  private clampMiddlePoints(spanLength: number | null): void {
    if (spanLength == null || this.points.length <= 2) {
      return;
    }
    for (const control of this.points.controls.slice(1, -1)) {
      const value = control.controls.distanceToRefSupport.value;
      if (value == null) {
        continue;
      }
      const clamped = Math.min(Math.max(value, 0), spanLength);
      if (clamped !== value) {
        control.controls.distanceToRefSupport.setValue(clamped, { emitEvent: false });
      }
    }
  }

  /** Re-sorts the free points (all but the first/reference and last/closing) by their current distance to ref. support. */
  private reorderMiddlePoints(): void {
    const controls = this.points.controls;
    if (controls.length <= 2) {
      return;
    }
    const activeIndex = this.activePointIndex();
    const activeControl = activeIndex !== null ? controls[activeIndex] : null;

    const middle = controls
      .slice(1, -1)
      .sort((a, b) => (a.controls.distanceToRefSupport.value ?? 0) - (b.controls.distanceToRefSupport.value ?? 0));
    const sorted = [controls[0], ...middle, controls[controls.length - 1]];

    sorted.forEach((control, index) => {
      if (this.points.at(index) !== control) {
        this.points.setControl(index, control);
      }
    });

    if (activeControl) {
      const newActiveIndex = sorted.indexOf(activeControl);
      if (newActiveIndex !== activeIndex) {
        this.activePointIndex.set(newActiveIndex);
      }
    }
    this.pointsVersion.update((version) => version + 1);
  }

  /** Clamps and re-sorts the free points once the user is done editing a distance-to-ref-support field. */
  onDistanceBlur(): void {
    this.clampMiddlePoints(this.spanSupports().spanLength);
    this.reorderMiddlePoints();
  }
}
