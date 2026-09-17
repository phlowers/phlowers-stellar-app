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
  inject,
  OnDestroy
} from '@angular/core';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { FreePositioningPlotComponent } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.component';
import {
  FreePositioningPlacement,
  FreePositioningSelection
} from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { ObstacleFormService } from '@services/obstacles-form/obstaclesForm.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotService } from '@services/plot/plot.service';
import { LateralDistanceType, Position3D, ReferenceSupport } from '@shared/domain/models/obstacle.model';
import { getSupportAltitudeNgf } from '@core/services/free-positioning-data/free-positioning-data.helpers';

import { OBSTACLE_FREE_POSITIONING_CONFIG } from './obstacle-free-positioning.component.constantes';
import {
  computeNewObstaclePosition,
  parseObstacleFormPointIndex
} from './obstacle-free-positioning.component.helpers';

@Component({
  selector: 'app-obstacle-free-positioning',
  standalone: true,
  imports: [FreePositioningPlotComponent],
  templateUrl: './obstacle-free-positioning.component.html',
  styleUrl: './obstacle-free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObstacleFreePositioningComponent implements OnDestroy {
  readonly config = OBSTACLE_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  private readonly obstacleFormService = inject(ObstacleFormService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly plotService = inject(PlotService);

  constructor() {
    // Force and lock obstacle reference frame while free positioning is active.
    this.obstacleFormService.form.get('referenceSupport')?.setValue(ReferenceSupport.LEFT);
    this.obstacleFormService.form.get('altitudeType')?.setValue('absolute');
    this.obstacleFormService.form.get('lateralDistanceType')?.setValue(LateralDistanceType.SPAN_AXIS);
    this.obstacleFormService.form.get('referenceSupport')?.disable();
    this.obstacleFormService.form.get('altitudeType')?.disable();
    this.obstacleFormService.form.get('lateralDistanceType')?.disable();
  }

  /** Span frozen when free positioning was switched on; constant for the whole session. */
  readonly frozenSpan = this.plotOptionsService.frozenSpan;

  readonly points = computed(() =>
    this.dataService.getPoints(this.frozenSpan(), 'obstacle')
  );

  onPlacement(placement: FreePositioningPlacement): void {
    const activeIndex = this.obstaclesService.activePointIndex();
    if (typeof activeIndex !== 'number' || activeIndex < 0) return;

    const positions = (this.obstacleFormService.positions.value ?? []) as Position3D[];
    const activeObstacle = positions[activeIndex];
    if (!activeObstacle) return;

    const isAbsolute = this.obstacleFormService.form.get('altitudeType')?.value === 'absolute';
    const refAltitude = isAbsolute ? 0 : this.getReferenceSupportAltitude();

    const newPosition = computeNewObstaclePosition(activeObstacle, placement, isAbsolute, refAltitude);

    const positionGroup = this.obstacleFormService.positions.at(activeIndex);
    if (positionGroup) {
      positionGroup.patchValue(newPosition);
    }
  }

  onSelection(selection: FreePositioningSelection): void {
    if (selection.point.category === 'obstacle') {
      const formIndex = parseObstacleFormPointIndex(selection.point.id);
      if (formIndex !== null) {
        this.obstaclesService.activePointIndex.set(formIndex);
      }
    }
  }

  private getReferenceSupportAltitude(): number {
    const startSupport = this.frozenSpan();
    const referenceSupportValue = this.obstacleFormService.form.get('referenceSupport')?.value as
      | ReferenceSupport
      | undefined;
    const referenceSupportIndex = referenceSupportValue === ReferenceSupport.RIGHT ? startSupport + 1 : startSupport;
    return getSupportAltitudeNgf(this.plotService.litData(), referenceSupportIndex);
  }

  ngOnDestroy(): void {
    this.obstacleFormService.form.get('referenceSupport')?.enable();
    this.obstacleFormService.form.get('altitudeType')?.enable();
    this.obstacleFormService.form.get('lateralDistanceType')?.enable();
    this.plotOptionsService.setFreePositioningMode(false, 'obstacle');
  }
}
