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
  effect,
  inject,
  OnDestroy
} from '@angular/core';

import { resolveFrozenSpan } from '@core/services/free-positioning-data/free-positioning-data.helpers';
import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { FreePositioningPlotComponent } from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.component';
import {
  FreePositioningPlacement,
  FreePositioningSelection
} from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { PlotSpanService } from '@services/plot/plot-span.service';

import { LOADS_FREE_POSITIONING_CONFIG } from './loads-free-positioning.component.constantes';

/**
 * Loads tab free positioning wrapper: thin consumer of the shared FreePositioningPlotComponent
 * for placing/moving a span load on the profile plot.
 */
@Component({
  selector: 'app-loads-free-positioning',
  standalone: true,
  imports: [FreePositioningPlotComponent],
  templateUrl: './loads-free-positioning.component.html',
  styleUrl: './loads-free-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadsFreePositioningComponent implements OnDestroy {
  readonly config = LOADS_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  private readonly loadFormsService = inject(LoadFormsService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  private readonly spanService = inject(PlotSpanService);

  readonly frozenSpan = computed(() =>
    resolveFrozenSpan(
      this.loadFormsService.activeSpanSupportUuid(),
      (uuid) => this.spanService.getSupportIndex(uuid),
      this.plotOptionsService.plotOptions()?.startSupport ?? 0
    )
  );

  readonly points = computed(() =>
    this.dataService.getPoints(this.frozenSpan(), 'loads')
  );

  /** Keeps the disabled span selector display in sync with the frozen span. */
  private readonly frozenSpanSyncEffect = effect(() => this.plotOptionsService.syncFrozenSpan(this.frozenSpan()));

  onPlacement(placement: FreePositioningPlacement): void {
    this.loadFormsService.setLoadPosition(placement.alongSpan);
  }

  onSelection(_selection: FreePositioningSelection): void {
    // Only single load on span in free positioning
  }

  ngOnDestroy(): void {
    this.plotOptionsService.setFreePositioningMode(false, 'loads');
  }
}
