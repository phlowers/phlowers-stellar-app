/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { FreePositioningPlotComponent } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.component';
import {
  FreePositioningPlacement,
  FreePositioningSelection
} from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { DistanceMeasuringService } from '@features/studio/distance-measuring/distance-measuring.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';

import { DISTANCE_FREE_POSITIONING_CONFIG } from './distance-free-positioning.component.constantes';
import { computeNewDistancePosition, parseDistanceFormPointIndex } from './distance-free-positioning.component.helpers';

/**
 * Distance-measuring free positioning wrapper: thin consumer of the shared FreePositioningPlotComponent.
 */
@Component({
  selector: 'app-distance-free-positioning',
  standalone: true,
  imports: [FreePositioningPlotComponent],
  templateUrl: './distance-free-positioning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DistanceFreePositioningComponent implements OnDestroy {
  readonly config = DISTANCE_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  readonly distanceMeasuringService = inject(DistanceMeasuringService);
  private readonly plotOptionsService = inject(PlotOptionsService);

  /** Span frozen when free positioning was switched on; constant for the whole session. */
  readonly frozenSpan = this.plotOptionsService.frozenSpan;

  readonly points = computed(() => this.dataService.getPoints(this.frozenSpan(), 'distance'));

  onPlacement(placement: FreePositioningPlacement): void {
    const activeIndex = this.distanceMeasuringService.activePointIndex();
    if (activeIndex === null || activeIndex < 0) return;

    const positions = this.distanceMeasuringService.positions();
    const current = positions[activeIndex] ?? { x: null, y: null, z: null };

    const newPosition = computeNewDistancePosition(current, placement);
    const group = this.distanceMeasuringService.form.at(activeIndex);
    if (group) {
      group.patchValue(newPosition);
    }
  }

  onSelection(selection: FreePositioningSelection): void {
    if (selection.point.category === 'distance') {
      const formIndex = parseDistanceFormPointIndex(selection.point.id);
      if (formIndex !== null) {
        this.distanceMeasuringService.activePointIndex.set(formIndex);
      }
    }
  }

  ngOnDestroy(): void {
    this.plotOptionsService.setFreePositioningMode(false, 'distance');
  }
}
