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
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { FLOOR_FREE_POSITIONING_CONFIG } from './floor-free-positioning.component.constantes';
import { parseFloorFormPointIndex } from './floor-free-positioning.component.helpers';

/**
 * Floor tab free-positioning wrapper: thin consumer of the shared FreePositioningPlotComponent
 * for editing a floor profile on the profile plot.
 */
@Component({
  selector: 'app-floor-free-positioning',
  standalone: true,
  imports: [FreePositioningPlotComponent],
  templateUrl: './floor-free-positioning.component.html',
  styleUrl: './floor-free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorFreePositioningComponent implements OnDestroy {
  readonly config = FLOOR_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  readonly floorFormService = inject(FloorFormService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotOptionsService = inject(PlotOptionsService);

  readonly frozenSpan = computed(() =>
    resolveFrozenSpan(
      this.floorFormService.spanValue(),
      (uuid) => this.spanService.getSupportIndex(uuid),
      this.plotOptionsService.plotOptions()?.startSupport ?? 0
    )
  );

  readonly points = computed(() =>
    this.dataService.getPoints(this.frozenSpan(), 'floor')
  );

  /** Keeps the disabled span selector display in sync with the frozen span. */
  private readonly frozenSpanSyncEffect = effect(() => this.plotOptionsService.syncFrozenSpan(this.frozenSpan()));

  onPlacement(placement: FreePositioningPlacement): void {
    const activeIndex = this.floorFormService.activePointIndex();
    if (activeIndex === null || !this.floorFormService.pointsView()[activeIndex]?.meta.removable) return;

    this.floorFormService.setFreePointPosition(activeIndex, {
      distanceToRefSupport: placement.alongSpan,
      altitude: placement.altitude
    });
  }

  onSelection(selection: FreePositioningSelection): void {
    if (selection.point.category === 'floor') {
      const formIndex = parseFloorFormPointIndex(selection.point.id);
      if (formIndex !== null) {
        this.floorFormService.setActivePoint(formIndex);
      }
    }
  }

  ngOnDestroy(): void {
    this.plotOptionsService.setFreePositioningMode(false, 'floor');
  }
}

