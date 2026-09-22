/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DistanceMeasuringService } from '@features/studio/distance-measuring/distance-measuring.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotService } from '@services/plot/plot.service';
import { Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { aggregateFreePositioningPoints, getSupportAltitudeNgf } from './free-positioning-data.helpers';
import {
  AggregatePointsParams,
  FreePositioningCategory,
  FreePositioningPoint
} from './free-positioning-data.interfaces';

@Injectable({
  providedIn: 'root'
})
export class FreePositioningDataService {
  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);
  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly floorFormService = inject(FloorFormService);
  private readonly distanceMeasuringService = inject(DistanceMeasuringService);
  private readonly translocoService = inject(TranslocoService);

  /**
   * Builds the aggregated parameters needed to extract points across all categories for a frozen span.
   */
  buildAggregateParams(
    frozenSpan: number,
    editableCategory: FreePositioningCategory,
    overrides?: Partial<AggregatePointsParams>
  ): AggregatePointsParams {
    const section = this.spanService.section();
    const supports = section?.supports ?? [];
    const litData = this.plotService.litData();

    // Obstacle form state — read the reactive snapshot so the points recompute on every form change,
    // matching the distance tab (which reads its positions signal).
    const obstaclePositions = (this.obstacleFormService.positionsSnapshot() ?? []) as Position3D[];
    const activeObstacleIndex = this.obstaclesService.activePointIndex();
    const activeObstacleSupportUuid = this.obstacleFormService.form?.get('supportUuid')?.value as string | undefined;
    const activeObstacleUuid = this.obstacleFormService.form?.get('uuid')?.value as string | undefined;
    const isAbsoluteAltitude = this.obstacleFormService.form?.get('altitudeType')?.value === 'absolute';
    const referenceSupportValue = this.obstacleFormService.form?.get('referenceSupport')?.value as
      ReferenceSupport | undefined;
    const referenceSupportIndex = referenceSupportValue === ReferenceSupport.RIGHT ? frozenSpan + 1 : frozenSpan;
    const refAltitude = getSupportAltitudeNgf(litData, referenceSupportIndex);

    // Floor form state
    const floorPoints = (this.floorFormService.pointsView?.() ?? []).map(({ group, meta }) => ({
      distanceToRefSupport: group.controls.distanceToRefSupport.value,
      altitude: group.controls.altitude.value,
      removable: meta.removable
    }));
    const activeFloorIndex = this.floorFormService.activePointIndex();
    const activeFloorSpan = this.floorFormService.spanValue();
    // Signal-backed, so flipping the reference support re-renders the floor points mirrored.
    const floorReferenceSupport = this.floorFormService.referenceSupportValue();

    // Distance state
    const distancePositions = this.distanceMeasuringService.positions();
    const distanceActiveIndex = this.distanceMeasuringService.activePointIndex();
    const distanceSupportUuid = this.distanceMeasuringService.selectedSupportUuid();

    // Load state
    const currentChargeUuid = section?.selected_charge_uuid;
    const currentCharge = section?.charges?.find((c) => c.uuid === currentChargeUuid);
    const temporaryLoad = this.plotService.temporaryLoadData?.spanLoads?.[frozenSpan];
    const spanLoad = temporaryLoad ?? currentCharge?.data?.spanLoads?.[frozenSpan];

    return {
      frozenSpan,
      editableCategory,
      section,
      litData,
      supports,
      activeObstaclePositions: obstaclePositions,
      activeObstacleIndex,
      activeObstacleSupportUuid,
      activeObstacleUuid,
      referenceSupportAltitudeNgf: refAltitude,
      isAbsoluteAltitude,
      activeFloorPoints: floorPoints,
      activeFloorIndex,
      activeFloorSpan,
      floorReferenceSupport,
      distancePositions,
      distanceActiveIndex,
      distanceSupportUuid,
      loadPosition: spanLoad?.loadPosition,
      loadType: spanLoad?.type as 'punctual' | 'marking' | undefined,
      loadSpanSupportUuid: spanLoad?.supportUuid,
      loadReferenceSupport: spanLoad?.referenceSupport,
      ...overrides
    };
  }

  /**
   * Collects and transforms all category points into the unified FreePositioningPoint model for a frozen span.
   */
  getPoints(
    frozenSpan: number,
    editableCategory: FreePositioningCategory,
    overrides?: Partial<AggregatePointsParams>
  ): FreePositioningPoint[] {
    const params = this.buildAggregateParams(frozenSpan, editableCategory, overrides);
    return aggregateFreePositioningPoints(params).map((point) =>
      point.nameKey ? { ...point, name: this.translocoService.translate(point.nameKey, point.nameParams) } : point
    );
  }
}
