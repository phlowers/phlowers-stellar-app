/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { computed, effect, Injectable, inject, signal, untracked } from '@angular/core';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { v4 as uuidv4 } from 'uuid';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { SectionService } from '@services/section/section.service';
import { NotificationService } from '@services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import {
  FloorPointFormGroup,
  FloorPointMeta,
  FloorResults,
  SpanSupports,
  SupportOption
} from '@shared/domain/floor/floor-form.interfaces';
import { computeFloorClearance, mapFloorToObstacle } from '@shared/domain/floor/floor-form.helpers';
import { Floor, FloorPoint } from '@shared/domain/models/floor.model';

/** Service owning the floor tab's reactive form, so both the form UI and the free-positioning plot can share it. */
@Injectable({
  providedIn: 'root'
})
export class FloorFormService {
  private readonly fb = inject(FormBuilder);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);
  private readonly obstacleStateService = inject(ObstacleStateService);
  private readonly obstaclesService = inject(ObstaclesService);

  readonly form = this.fb.group({
    span: new FormControl<string | null>(null),
    referenceSupport: new FormControl<'LEFT' | 'RIGHT' | null>({ value: null, disabled: true })
  });

  /** Reactive form array of floor points. Index 0 is the reference support point, last index the closing one, others are free points sorted by distance to ref. support. */
  readonly points: FormArray<FloorPointFormGroup> = this.fb.array([this.createPointGroup(), this.createPointGroup()]);

  readonly activePointIndex = signal<number | null>(null);

  /** Point to activate once the form finishes loading a floor selected from the plot (span/reference may differ from the current one). */
  private readonly pendingActivePoint = signal<{ floorUuid: string; pointIndex: number } | null>(null);

  /** Bumped on every structural change to `points` (add/reorder) so `pointsView` recomputes; `points` itself isn't a signal. */
  private readonly pointsVersion = signal(0);

  readonly spanOptions = computed(() => this.spanService.getSpanOptions());
  readonly supportsOptions = signal<SupportOption[]>([]);

  readonly spanValue = toSignal(this.form.controls.span.valueChanges, {
    initialValue: this.form.controls.span.value
  });

  readonly referenceSupportValue = toSignal(this.form.controls.referenceSupport.valueChanges, {
    initialValue: this.form.controls.referenceSupport.value
  });

  /** Snapshot of the points array values, so computed signals can react to point edits (the `FormArray` itself isn't a signal). */
  private readonly pointsSnapshot = toSignal(this.points.valueChanges, { initialValue: this.points.value });

  /** Signal indicating if the floor calculation/save is in progress. */
  readonly isCalculating = signal(false);

  // A span holds at most one floor profile, whichever reference support it was saved with: keying it
  // on the reference support too would hide the floor when the user flips the side and let a save
  // create a second floor for the same span (the upsert replaces by uuid).
  readonly savedFloor = computed<Floor | undefined>(() => {
    const supportUuid = this.spanValue();
    if (!supportUuid) {
      return undefined;
    }
    return this.spanService.section()?.floors?.find((floor) => floor.supportUuid === supportUuid);
  });

  // Saved points expressed from the currently selected reference support: flipping the side mirrors
  // the distances along the span and reverses the order, so the same profile is edited from the
  // other end instead of being read as if it had been measured from it.
  private readonly orientedFloorPoints = computed<FloorPoint[] | undefined>(() => {
    const floor = this.savedFloor();
    const referenceSupport = this.referenceSupportValue();
    if (!floor) {
      return undefined;
    }
    const { spanLength } = this.spanSupports();
    if (!referenceSupport || referenceSupport === floor.referenceSupport || spanLength == null) {
      return floor.points;
    }
    return floor.points
      .map((point) => ({
        ...point,
        distanceToRefSupport: point.distanceToRefSupport == null ? null : spanLength - point.distanceToRefSupport
      }))
      .reverse();
  });

  // Whether the currently selected span already has a saved floor — used to enable the erase button.
  readonly isFloorSaved = computed(() => !!this.savedFloor());

  // UUID of the saved floor for the current span, or `null` — used to link the plot's floor markers to the form.
  readonly savedFloorUuid = computed<string | null>(() => this.savedFloor()?.uuid ?? null);

  // Active point index expressed in the saved floor's own point order, which the plot traces and the
  // worker distances are indexed on: while the form reads the profile from the other end, the two
  // orders are mirrored.
  readonly activeSavedPointIndex = computed<number | null>(() => {
    const floor = this.savedFloor();
    const index = this.activePointIndex();
    this.pointsVersion();
    if (!floor || index === null) {
      return null;
    }
    return this.referenceSupportValue() === floor.referenceSupport ? index : this.points.length - 1 - index;
  });

  /**
   * Vertical-clearance results for the saved floor, derived reactively from the engine's rendered
   * geometry: the floor polyline (`litData.obstacles`, positioned by the same obstacle tasks — see
   * `mapFloorToObstacle`) against the span's catenary (`litData.coords.spans`).
   *
   * The worker's per-point distances are not enough here: they only cover the floor's own points,
   * while the narrowest clearance usually falls between them, where the cable sags (a floor holding
   * just its two support points would report the clearance at the supports). `computeFloorClearance`
   * compares the two curves over the whole span instead. Updates automatically after
   * `calculateAndSave()` or on section load (once floors are projected alongside obstacles).
   */
  readonly results = computed<FloorResults>(() => {
    const floor = this.savedFloor();
    const litData = this.plotService.litData();
    if (!floor || !litData) {
      return { minVerticalDistance: null, floorAltitude: null, cableAltitude: null };
    }
    const floorPoints = litData.obstacles?.find((obstacle) => obstacle.uuid === floor.uuid)?.points;
    const cablePoints = litData.coords?.spans?.[this.spanService.getSupportIndex(floor.supportUuid)];
    const clearance = floorPoints && cablePoints ? computeFloorClearance(floorPoints, cablePoints) : null;
    return clearance ?? { minVerticalDistance: null, floorAltitude: null, cableAltitude: null };
  });

  /** Whether the form holds enough data (span, reference support, and every point filled in) to calculate and save. */
  readonly canCalculateAndSave = computed(() => {
    const supportUuid = this.spanValue();
    const referenceSupport = this.referenceSupportValue();
    // Depend on both: field edits emit valueChanges, while loading a saved floor and add/remove/reorder
    // rebuild the array with `emitEvent: false` and only bump the version. Read the live values, since
    // the snapshot is stale after those silent rebuilds.
    this.pointsSnapshot();
    this.pointsVersion();
    const points = this.points.value;
    return (
      !!supportUuid &&
      !!referenceSupport &&
      points.length > 0 &&
      points.every((point) => point.altitude != null && point.distanceToRefSupport != null)
    );
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
    return side === 'LEFT'
      ? { reference: left, closing: right, spanLength }
      : { reference: right, closing: left, spanLength };
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
    const savedFloor = untracked(() => this.spanService.section()?.floors?.find((f) => f.supportUuid === supportUuid));
    if (savedFloor && this.form.controls.referenceSupport.value !== savedFloor.referenceSupport) {
      this.form.controls.referenceSupport.setValue(savedFloor.referenceSupport);
    }
  });

  // Rebuilds the points form array from the saved floor whenever one exists for the selected span, so
  // re-opening the studio restores its points and flipping the reference support re-reads them from
  // the other end.
  private readonly loadSavedFloorEffect = effect(() => {
    this.spanValue();
    const floor = this.savedFloor();
    const floorPoints = this.orientedFloorPoints();
    untracked(() => {
      while (this.points.length > 0) {
        this.points.removeAt(0, { emitEvent: false });
      }
      const points = floorPoints ?? [null, null];
      for (const point of points) {
        const group = this.createPointGroup();
        group.controls.altitude.setValue(point?.altitude ?? null, { emitEvent: false });
        group.controls.distanceToRefSupport.setValue(point?.distanceToRefSupport ?? null, { emitEvent: false });
        this.points.push(group, { emitEvent: false });
      }
      // Apply a point selected from the plot once its floor finished loading; otherwise reset selection.
      const pending = untracked(() => this.pendingActivePoint());
      if (pending && floor?.uuid === pending.floorUuid) {
        this.activePointIndex.set(pending.pointIndex);
        this.pendingActivePoint.set(null);
      } else {
        this.activePointIndex.set(null);
      }
      this.pointsVersion.update((version) => version + 1);
    });
  });

  /** Populates point altitudes from support foot altitude, keeps the reference distance to ref. support at 0, and sets the closing distance to ref. support to the span length whenever the resolved supports change. */
  private readonly pointsEffect = effect(() => {
    const { reference, closing, spanLength } = this.spanSupports();
    untracked(() => {
      const controls = this.points.controls;
      const referencePoint = controls[0];
      const closingPoint = controls.at(-1);
      // Only the supports that actually carry a foot altitude drive their endpoint: without one the
      // field stays editable (see `pointsMeta`), so the saved/typed value must survive.
      if (reference?.supportFootAltitude != null) {
        referencePoint.controls.altitude.setValue(reference.supportFootAltitude, { emitEvent: false });
      }
      referencePoint.controls.distanceToRefSupport.setValue(0, { emitEvent: false });
      if (closing?.supportFootAltitude != null) {
        closingPoint?.controls.altitude.setValue(closing.supportFootAltitude, { emitEvent: false });
      }
      closingPoint?.controls.distanceToRefSupport.setValue(spanLength, { emitEvent: false });
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

  /** Re-centers the plot on the selected span. */
  returnToSpan(): void {
    const spanUuid = this.form.get('span')?.value;
    if (!spanUuid) {
      return;
    }
    const supportIndex = this.spanService.getSupportIndex(spanUuid);
    if (supportIndex >= 0) {
      this.plotOptionsService.camera.set(null);
      this.plotService.plotOptionsChange({
        startSupport: supportIndex,
        endSupport: supportIndex + 1
      });
      this.spanService.spanAmountChoice.set('single');
    }
  }

  /**
   * Sets the point that the plot click should edit and highlight, and mirrors it in quick-measures
   * and the plot's distance layer — both read the selection from `ObstaclesService`, so selecting a
   * point from the form must sync it too, not only a plot/quick-measures click (`selectFloorPoint`).
   */
  setActivePoint(index: number): void {
    this.activePointIndex.set(index);
    const floorUuid = this.savedFloorUuid();
    const savedIndex = this.activeSavedPointIndex();
    if (!floorUuid || savedIndex === null) {
      return;
    }
    this.obstaclesService.setSelectedMeasure(floorUuid, savedIndex);
    this.obstacleStateService.distanceType.set('vertical');
  }

  /**
   * Selects a floor point picked from the plot or from the quick-measures selects. If the point's
   * floor is already open in the form from the side it was saved with, it activates it directly;
   * otherwise it switches the form to that floor's span/reference support — the point index comes
   * from the stored point order — and activates the point once the form finishes loading
   * (see `loadSavedFloorEffect`).
   */
  selectFloorPoint(floorUuid: string, pointIndex: number): void {
    const floor = this.spanService.section()?.floors?.find((f) => f.uuid === floorUuid);
    if (!floor) {
      return;
    }
    // Mirror the obstacle behaviour: a point picked on the plot is also selected in quick-measures,
    // which shows its distances and draws them on the plot. Floors have no distance-type radios, so
    // their only distance is shown right away.
    this.obstaclesService.setSelectedMeasure(floorUuid, pointIndex);
    this.obstacleStateService.distanceType.set('vertical');

    const isCurrentFloor =
      this.spanValue() === floor.supportUuid && this.referenceSupportValue() === floor.referenceSupport;
    if (isCurrentFloor) {
      this.setActivePoint(pointIndex);
      return;
    }
    this.pendingActivePoint.set({ floorUuid, pointIndex });
    this.form.controls.span.setValue(floor.supportUuid);
    this.form.controls.referenceSupport.enable({ emitEvent: false });
    this.form.controls.referenceSupport.setValue(floor.referenceSupport);
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
      this.setActivePoint(activeIndex - 1);
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
    const sorted = [controls[0], ...middle, controls.at(-1)!];

    sorted.forEach((control, index) => {
      if (this.points.at(index) !== control) {
        this.points.setControl(index, control);
      }
    });

    if (activeControl) {
      const newActiveIndex = sorted.indexOf(activeControl);
      if (newActiveIndex !== activeIndex) {
        this.setActivePoint(newActiveIndex);
      }
    }
    this.pointsVersion.update((version) => version + 1);
  }

  /** Clamps and re-sorts the free points once the user is done editing a distance-to-ref-support field. */
  onDistanceBlur(): void {
    this.clampMiddlePoints(this.spanSupports().spanLength);
    this.reorderMiddlePoints();
  }

  /** Builds a `Floor` domain object from the current form state, reusing the saved UUID when one already exists. */
  private buildFloorFromForm(): Floor {
    return {
      uuid: this.savedFloor()?.uuid ?? uuidv4(),
      supportUuid: this.spanValue()!,
      referenceSupport: this.referenceSupportValue()!,
      points: this.points.value.map((point) => ({
        altitude: point.altitude ?? null,
        distanceToRefSupport: point.distanceToRefSupport ?? null
      }))
    };
  }

  /**
   * Calculates and saves the floor for the currently selected span, from the currently selected
   * reference support (it replaces the span's saved floor, whichever side that one was saved with).
   *
   * The floor is registered through the same obstacle tasks used for actual obstacles
   * (`addSingleObstacle` + `refreshProjection`), reusing their distance-to-cable calculation
   * instead of duplicating it — see `mapFloorToObstacle`.
   */
  async calculateAndSave(): Promise<void> {
    if (!this.canCalculateAndSave() || this.isCalculating()) {
      return;
    }
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section) {
      return;
    }

    this.isCalculating.set(true);
    const previousFloor = this.savedFloor();
    const floor = this.buildFloorFromForm();
    try {
      const updatedFloors = [...(section.floors ?? []).filter((f) => f.uuid !== floor.uuid), floor];
      const updatedSection = { ...section, floors: updatedFloors };

      const obstacle = mapFloorToObstacle(floor, this.spanService.getSupportIndex(floor.supportUuid));
      await this.obstacleStateService.addSingleObstacle(obstacle, this.plotOptionsService.plotOptions());

      await this.sectionService.createOrUpdateSection(study, updatedSection);
      // Publish the section only once the worker and IndexedDB both hold the floor: `savedFloor()`
      // drives the "saved" UI state, which must not outlive a failed save.
      this.spanService.section.set(updatedSection);
      await this.plotService.refreshProjection();

      this.notificationService.success(this.translocoService.translate('shared.floor-form-service.save-detail'));
    } catch (error) {
      this.logger.warn('Failed to save floor', error);
      await this.restoreWorkerFloor(previousFloor, floor.uuid);
      this.notificationService.error(this.translocoService.translate('shared.floor-form-service.save-error-detail'));
    } finally {
      this.isCalculating.set(false);
    }
  }

  // Erases the floor saved for the currently selected span. No-op if none is saved.
  async eraseFloor(): Promise<void> {
    const floor = this.savedFloor();
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!floor || !study || !section) {
      return;
    }
    const updatedSection = { ...section, floors: (section.floors ?? []).filter((f) => f.uuid !== floor.uuid) };
    try {
      await this.obstacleStateService.deleteObstacle(floor.uuid, this.plotOptionsService.plotOptions());
      await this.sectionService.createOrUpdateSection(study, updatedSection);
      this.spanService.section.set(updatedSection);
      await this.plotService.refreshProjection();
      // Drop the shared quick-measures selection when it points at the floor just deleted: it would
      // otherwise keep a dangling uuid, no longer read as a floor but still truthy enough to leave
      // the obstacle distance-type radios enabled. Same reset as deleting an obstacle.
      if (this.obstaclesService.selectedMeasureUuid() === floor.uuid) {
        this.obstaclesService.setSelectedMeasure(null, null);
        this.obstacleStateService.distanceType.set(null);
      }
      this.notificationService.success(this.translocoService.translate('shared.floor-form-service.delete-detail'));
    } catch (error) {
      this.logger.warn('Failed to delete floor', error);
      await this.restoreWorkerFloor(floor, floor.uuid);
      this.notificationService.error(this.translocoService.translate('shared.floor-form-service.delete-error-detail'));
    }
  }

  // The worker keeps whatever a failed save or erase already registered, while the section stays on
  // its previous state: put the previously saved floor back (same uuid, so it overwrites), or drop
  // the one just registered when there was none, so distances match the section again.
  private async restoreWorkerFloor(previousFloor: Floor | undefined, uuid: string): Promise<void> {
    const plotOptions = this.plotOptionsService.plotOptions();
    try {
      if (previousFloor) {
        const obstacle = mapFloorToObstacle(previousFloor, this.spanService.getSupportIndex(previousFloor.supportUuid));
        await this.obstacleStateService.addSingleObstacle(obstacle, plotOptions);
      } else {
        await this.obstacleStateService.deleteObstacle(uuid, plotOptions);
      }
      await this.plotService.refreshProjection();
    } catch (error) {
      this.logger.warn('Failed to restore floor worker state after rollback', error);
    }
  }
}
