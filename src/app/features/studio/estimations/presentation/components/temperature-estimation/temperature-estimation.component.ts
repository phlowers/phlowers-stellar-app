/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { DecimalPipe, formatNumber } from '@angular/common';
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
  CONFORMITY_TEMPERATURE_FORMAT,
  TARGET_DISTANCE_DECIMALS,
  TARGET_DISTANCE_LIMITS,
  TARGET_DISTANCE_MAX,
  TARGET_DISTANCE_MIN
} from '@features/studio/estimations/domain/estimations.constantes';
import { TemperatureEstimationFormValue } from '@features/studio/estimations/domain/estimations.interfaces';
import { toTemperatureEstimationInputs } from '@features/studio/estimations/presentation/estimations.helpers';
import { EstimationFormBase } from '@features/studio/estimations/presentation/estimation-form.base';

/** "Conformity temperature" tab: estimates the cable temperature reaching a target distance to an obstacle point (US.EST.TCO). */
@Component({
  selector: 'app-temperature-estimation',
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
  templateUrl: './temperature-estimation.component.html',
  styleUrl: './temperature-estimation.component.scss'
})
export class TemperatureEstimationComponent extends EstimationFormBase<Task.estimateTemperature, 'targetDistance'> {
  protected readonly task = Task.estimateTemperature;
  protected readonly calculationFailedKey = 'studio.estimations.calculation-failed';
  protected readonly calculationFailedLog = 'Failed to estimate the conformity temperature';

  readonly limits = TARGET_DISTANCE_LIMITS;
  readonly temperatureFormat = CONFORMITY_TEMPERATURE_FORMAT;

  /** Error of the target distance, once edited or touched. */
  readonly targetDistanceError = this.numberInputError(this.form.controls.targetDistance);

  /** Estimated conformity temperature (°C); null hides the results frame. */
  readonly temperature = computed(() => this.result()?.value ?? null);

  /** Copies the displayed conformity temperature (without unit) to the clipboard. */
  async copyTemperature(): Promise<void> {
    const temperature = this.temperature();
    if (temperature === null) return;
    await this.copyToClipboard(formatNumber(temperature, this.locale, CONFORMITY_TEMPERATURE_FORMAT));
  }

  protected createValueControls() {
    return {
      targetDistance: createNumberControl(TARGET_DISTANCE_MIN, TARGET_DISTANCE_MAX, TARGET_DISTANCE_DECIMALS)
    };
  }

  protected toInputs(value: TemperatureEstimationFormValue, obstacle: Obstacle | null) {
    return toTemperatureEstimationInputs(value, obstacle);
  }
}
