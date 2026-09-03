/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { animate, style, transition, trigger } from '@angular/animations';
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstacleStateService } from '@services/obstacle-state/obstacle-state.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';

/**
 * Quick-measures card: pick an obstacle or a floor visible in the current span window,
 * pick one of its points, then a distance type to display on the plot.
 * Obstacles offer oblique/vertical/horizontal distances; floors offer the vertical
 * distance to the cable and the cable altitude right above the floor point.
 */
@Component({
  selector: 'app-quick-measures',
  imports: [DecimalPipe, FormsModule, TranslocoModule, RadioButtonModule, SelectModule],
  templateUrl: './quick-measures.component.html',
  styleUrl: './quick-measures.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('pointSelect', [
      transition(':enter', [
        style({ width: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ width: '*', opacity: 1 }))
      ]),
      transition(':leave', [style({ overflow: 'hidden' }), animate('200ms ease-in', style({ width: 0, opacity: 0 }))])
    ]),
    // Swaps the obstacle rows for the floor rows (and back) when the selection changes.
    // Applied per row: `.quick-measures__list` is `display: contents`, so it has no box to animate.
    trigger('measureRow', [
      transition(':enter', [
        style({ width: 0, opacity: 0, overflow: 'hidden' }),
        animate('200ms ease-out', style({ width: '*', opacity: 1 }))
      ]),
      transition(':leave', [style({ overflow: 'hidden' }), animate('200ms ease-in', style({ width: 0, opacity: 0 }))])
    ])
  ]
})
export class QuickMeasuresComponent {
  private readonly translocoService = inject(TranslocoService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly floorFormService = inject(FloorFormService);
  public readonly obstaclesService = inject(ObstaclesService);
  public readonly obstacleFormService = inject(ObstacleFormService);
  protected readonly obstacleStateService = inject(ObstacleStateService);

  /** Obstacles and floors attached to a support inside the visible span window (endSupport exclusive). */
  filteredMeasureOptions = computed(() => {
    const section = this.spanService.section();
    if (!section) return [];
    const { startSupport, endSupport } = this.plotOptionsService.plotOptions();
    const visibleSupportUuids = new Set(section.supports.slice(startSupport, endSupport).map((s) => s.uuid));
    const spanOptions = this.spanService.getSpanOptions();
    const options: { label: string; value: string | null }[] = section.obstacles
      .filter((o) => visibleSupportUuids.has(o.supportUuid))
      .map((o) => ({ label: o.name, value: o.uuid }));
    for (const floor of section.floors ?? []) {
      if (!visibleSupportUuids.has(floor.supportUuid)) continue;
      const spanLabel = spanOptions.find((option) => option.value === floor.supportUuid)?.label ?? '';
      options.push({
        label: this.translocoService.translate('studio.quick-measures.floor-option', { span: spanLabel }),
        value: floor.uuid
      });
    }
    if (options.length) {
      options.unshift({
        label: this.translocoService.translate('studio.quick-measures.not-selected-option'),
        value: null
      });
    }
    return options;
  });

  /** Whether the current selection is a floor (switches the distance list to its 2 floor metrics). */
  isFloorSelected = computed(() => {
    const uuid = this.obstaclesService.selectedMeasureUuid();
    return !!uuid && !!this.spanService.section()?.floors?.some((floor) => floor.uuid === uuid);
  });

  obstaclePointOptions = computed(() => {
    const uuid = this.obstaclesService.selectedMeasureUuid();
    if (!uuid) return [];
    const section = this.spanService.section();
    const floor = section?.floors?.find((f) => f.uuid === uuid);
    if (floor) {
      // Same naming as the floor plot hover: point + distance to reference support.
      return floor.points.map((point, index) => ({
        label: this.translocoService.translate('studio.floor.point-title', {
          distance: (point.distanceToRefSupport ?? 0).toFixed(2)
        }),
        value: index
      }));
    }
    const obstacle = section?.obstacles.find((o) => o.uuid === uuid);
    if (!obstacle) return [];
    return obstacle.positions.map((_, index) => ({
      label: this.translocoService.translate('studio.quick-measures.point-option', { index: index + 1 }),
      value: index
    }));
  });

  /** Worker distance computed for the selected floor point, feeding both floor rows. */
  private readonly floorDistancePoint = computed(() => {
    const uuid = this.obstaclesService.selectedMeasureUuid();
    const pointIndex = this.obstaclesService.activePointIndex();
    if (!uuid || pointIndex === null) return null;
    return (
      this.obstacleStateService
        .distances()
        .filter((distance) => distance.obstacleUuid === uuid)
        .flatMap((distance) => distance.points)
        .find((p) => p.pointIndex === pointIndex) ?? null
    );
  });

  /** Cable altitude right above the selected floor point ('Alt. cable' row), read from the worker distances. */
  floorCableAltitude = computed<number | null>(
    // virtualPointVertical sits on the cable right above the point, so its z is the cable altitude.
    () => this.floorDistancePoint()?.virtualPointVertical?.[2] ?? null
  );

  /**
   * Vertical clearance for the selected floor point, signed: negative when the cable dips below the
   * floor. Obstacles keep the non-negative `results().vertical` instead.
   */
  floorVerticalDistance = computed<number | null>(() => {
    const point = this.floorDistancePoint();
    return point?.signedDistanceVertical ?? point?.distanceVertical ?? null;
  });

  onObstacleSelect(uuid: string | null) {
    this.obstacleStateService.distanceType.set(null);
    const section = this.spanService.section();
    if (uuid && section?.floors?.some((floor) => floor.uuid === uuid)) {
      this.obstaclesService.setSelectedMeasure(uuid, null);
      return;
    }
    const obstacle = uuid ? section?.obstacles.find((o) => o.uuid === uuid) : null;
    const pointIndex = obstacle?.positions.length === 1 ? 0 : null;
    this.obstaclesService.setSelectedMeasure(uuid, pointIndex);
    if (obstacle) {
      this.obstacleFormService.setExistingObstacle(obstacle, pointIndex ?? 0);
    }
  }

  onPointSelect(index: number) {
    this.obstaclesService.activePointIndex.set(index);
    const uuid = this.obstaclesService.selectedMeasureUuid();
    if (uuid && this.isFloorSelected()) {
      // Same entry point as a plot click on the point: syncs the floor form and, since floors have
      // no distance-type radios, shows their vertical distance right away.
      this.floorFormService.selectFloorPoint(uuid, index);
    }
  }
}
