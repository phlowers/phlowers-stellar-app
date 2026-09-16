/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { FreePositioningPlotComponent } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.component';
import {
  FreePositioningPlacement,
  FreePositioningSelection
} from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { resolveFrozenSpan } from '@core/services/free-positioning-data/free-positioning-data.helpers';
import { DistanceMeasuringService } from '@features/studio/distance-measuring/distance-measuring.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { DISTANCE_FREE_POSITIONING_CONFIG } from './distance-free-positioning.component.constantes';
import {
  computeNewDistancePosition,
  parseDistanceFormPointIndex
} from './distance-free-positioning.component.helpers';

/**
 * Distance-measuring free positioning wrapper: thin consumer of the shared FreePositioningPlotComponent.
 */
@Component({
  selector: 'app-distance-free-positioning',
  standalone: true,
  imports: [FreePositioningPlotComponent],
  templateUrl: './distance-free-positioning.component.html',
  styleUrl: './distance-free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DistanceFreePositioningComponent implements OnDestroy {
  readonly config = DISTANCE_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  readonly distanceMeasuringService = inject(DistanceMeasuringService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);

  readonly frozenSpan = computed(() =>
    resolveFrozenSpan(
      this.distanceMeasuringService.selectedSupportUuid(),
      (uuid) => this.spanService.getSupportIndex(uuid),
      this.plotOptionsService.plotOptions()?.startSupport ?? 0
    )
  );

  readonly points = computed(() =>
    this.dataService.getPoints(this.frozenSpan(), 'distance')
  );

  /** Keeps the disabled span selector display in sync with the frozen span. */
  private readonly frozenSpanSyncEffect = effect(() => this.plotOptionsService.syncFrozenSpan(this.frozenSpan()));

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

