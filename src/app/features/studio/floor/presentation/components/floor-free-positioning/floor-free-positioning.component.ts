/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { FreePositioningDataService } from '@core/services/free-positioning-data/free-positioning-data.service';
import { mirrorPositionForReferenceSupport } from '@core/services/free-positioning-data/free-positioning-data.helpers';
import { PlotService } from '@services/plot/plot.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { FloorFormService } from '@services/floor-form/floor-form.service';
import { formatStudioError } from '@shared/components/studio/helpers/errors';
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';

import {
  FreePositioningPlacement,
  FreePositioningSelection
} from '@features/studio/core/presentation/components/free-positioning-plot/free-positioning-plot.interfaces';
import { MousePosition } from './floor-free-positioning.component.interfaces';

import { FLOOR_FREE_POSITIONING_CONFIG } from './floor-free-positioning.component.constantes';
import { parseFloorFormPointIndex } from './floor-free-positioning.component.helpers';

/**
 * Floor tab free-positioning wrapper: thin consumer of the shared FreePositioningPlotComponent
 * for editing a floor profile on the profile plot.
 */
@Component({
  selector: 'app-floor-free-positioning',
  standalone: true,
  imports: [ProgressSpinnerModule, TranslocoModule],
  templateUrl: './floor-free-positioning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FloorFreePositioningComponent implements OnDestroy {
  readonly config = FLOOR_FREE_POSITIONING_CONFIG;

  private readonly dataService = inject(FreePositioningDataService);
  readonly floorFormService = inject(FloorFormService);
  private readonly plotOptionsService = inject(PlotOptionsService);
  readonly plotService = inject(PlotService);
  private readonly translocoService = inject(TranslocoService);
  private readonly logger = inject(LoggerService);

  readonly isLoading = signal<boolean>(true);
  readonly mousePosition = signal<MousePosition | null>(null);

  readonly getErrorString = computed(() => {
    const exceptionDiagnostic = this.plotService.diagnostics().find((diagnostic) => diagnostic.origin === 'exception');
    return formatStudioError(this.plotService.error(), this.translocoService, exceptionDiagnostic?.code ?? null);
  });

  /** Span frozen when free positioning was switched on; constant for the whole session. */
  readonly frozenSpan = this.plotOptionsService.frozenSpan;

  readonly points = computed(() => this.dataService.getPoints(this.frozenSpan(), 'floor'));

  onPlacement(placement: FreePositioningPlacement): void {
    const activeIndex = this.floorFormService.activePointIndex();
    if (activeIndex === null || !this.floorFormService.pointsView()[activeIndex]?.meta.removable) return;

    // The plot click abscissa is measured from the left support, while the form stores the distance
    // to the selected reference support. Mirror it for a RIGHT reference, then keep the value within
    // the display precision expected by that frame: normal left-side edits stay at one decimal, while
    // the mirrored RIGHT conversion can keep a second decimal to avoid drift after the side flip.
    const mirroredDistance = mirrorPositionForReferenceSupport(
      placement.alongSpan,
      this.floorFormService.spanSupports().spanLength,
      this.floorFormService.referenceSupportValue()
    );
    const distanceToRefSupport =
      this.floorFormService.referenceSupportValue() === 'RIGHT'
        ? Number.parseFloat(mirroredDistance.toFixed(2))
        : truncateNumberToOneDecimal(mirroredDistance);

    this.floorFormService.setFreePointPosition(activeIndex, {
      distanceToRefSupport,
      altitude: truncateNumberToOneDecimal(placement.altitude)
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
