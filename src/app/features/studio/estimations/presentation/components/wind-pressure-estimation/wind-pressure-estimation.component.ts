/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { Task } from '@services/worker_python/tasks/types';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { createNumberControl } from '@shared/helpers/numberValidators';
import {
  CABLE_TEMPERATURE_DECIMALS,
  CABLE_TEMPERATURE_LIMITS,
  MINIMUM_DISTANCE_WIND_PRESSURE_FORMAT,
  MINIMUM_OBLIQUE_DISTANCE_FORMAT
} from '@features/studio/estimations/domain/estimations.constantes';
import { WindPressureEstimationFormValue } from '@features/studio/estimations/domain/estimations.interfaces';
import { toWindPressureEstimationInputs } from '@features/studio/estimations/presentation/estimations.helpers';
import { EstimationFormBase } from '@features/studio/estimations/presentation/estimation-form.base';

/**
 * "Wind pressure for min. distance" tab: estimates, at a cable temperature, the wind pressure bringing the cable
 * closest to an obstacle point, with that minimum oblique distance (US.EST.PRE-DIS).
 */
@Component({
  selector: 'app-wind-pressure-estimation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    TranslocoModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './wind-pressure-estimation.component.html',
  styleUrl: './wind-pressure-estimation.component.scss'
})
export class WindPressureEstimationComponent extends EstimationFormBase<
  Task.estimateMinimumDistanceWind,
  'temperature'
> {
  protected readonly task = Task.estimateMinimumDistanceWind;
  protected readonly calculationFailedKey = 'studio.estimations.wind-pressure-calculation-failed';
  protected readonly calculationFailedLog = 'Failed to estimate the minimum distance wind pressure';

  readonly limits = CABLE_TEMPERATURE_LIMITS;
  readonly distanceFormat = MINIMUM_OBLIQUE_DISTANCE_FORMAT;
  readonly pressureFormat = MINIMUM_DISTANCE_WIND_PRESSURE_FORMAT;

  /** Error of the cable temperature, once edited or touched. */
  readonly temperatureError = this.numberInputError(this.form.controls.temperature);

  /** Estimated wind pressure (Pa) rounded as displayed; null hides the results frame. */
  readonly windPressure = computed(() => {
    const result = this.result();
    // + 0 turns a rounded -0 into 0, never displayed as "-0"
    return result ? Math.round(result.value) + 0 : null;
  });

  /** Minimum oblique distance (m) reached at the estimated wind pressure. */
  readonly minimumDistance = computed(() => this.result()?.distance ?? null);

  /** Copies the displayed wind pressure (without unit nor group separator) to the clipboard. */
  async copyWindPressure(): Promise<void> {
    const windPressure = this.windPressure();
    if (windPressure === null) return;
    await this.copyToClipboard(String(windPressure));
  }

  protected createValueControls() {
    return {
      temperature: createNumberControl(
        CABLE_TEMPERATURE_LIMITS.min,
        CABLE_TEMPERATURE_LIMITS.max,
        CABLE_TEMPERATURE_DECIMALS
      )
    };
  }

  protected toInputs(value: WindPressureEstimationFormValue, obstacle: Obstacle | null) {
    return toWindPressureEstimationInputs(value, obstacle);
  }
}
