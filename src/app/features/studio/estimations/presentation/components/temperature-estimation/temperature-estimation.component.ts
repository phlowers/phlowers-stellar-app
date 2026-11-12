/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { DecimalPipe, DOCUMENT, formatNumber } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { formatPythonError, formatPythonWarnings } from '@services/worker_python/tasks/python-error-messages';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { getRequiredNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { createNumberControl } from '@shared/helpers/numberValidators';
import {
  CONFORMITY_TEMPERATURE_FORMAT,
  TARGET_DISTANCE_DECIMALS,
  TARGET_DISTANCE_LIMITS,
  TARGET_DISTANCE_MAX,
  TARGET_DISTANCE_MIN
} from '@features/studio/estimations/domain/estimations.constantes';
import { TemperatureEstimation } from '@features/studio/estimations/domain/estimations.interfaces';
import {
  getDefaultPointIndex,
  getEstimableObstacles,
  getPreselectedObstacleUuid,
  toObstacleOptions,
  toPointOptions,
  toTemperatureEstimationInputs
} from '@features/studio/estimations/presentation/estimations.helpers';

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
export class TemperatureEstimationComponent {
  private readonly spanService = inject(PlotSpanService);
  private readonly obstaclesService = inject(ObstaclesService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly translocoService = inject(TranslocoService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly document = inject(DOCUMENT);
  private readonly locale = inject(LOCALE_ID);

  readonly limits = TARGET_DISTANCE_LIMITS;
  readonly temperatureFormat = CONFORMITY_TEMPERATURE_FORMAT;

  readonly form = new FormGroup({
    obstacleUuid: new FormControl<string | null>(null, Validators.required),
    // read-only in this user story: always the first point of the obstacle
    pointIndex: new FormControl<number | null>({ value: null, disabled: true }, Validators.required),
    targetDistance: createNumberControl(TARGET_DISTANCE_MIN, TARGET_DISTANCE_MAX, TARGET_DISTANCE_DECIMALS)
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue()
  });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

  /** Error of the target distance, once edited or touched. */
  readonly targetDistanceError = toSignal(
    this.form.controls.targetDistance.events.pipe(
      map(() => {
        const control = this.form.controls.targetDistance;
        return control.dirty || control.touched ? getRequiredNumberInputErrorParams(control) : null;
      })
    ),
    { initialValue: null }
  );

  /** The hint asking to choose an obstacle is only shown while none is selected. */
  readonly hasObstacle = computed(() => this.formValue().obstacleUuid !== null);

  private readonly obstacles = computed(() => getEstimableObstacles(this.spanService.section()?.obstacles));
  readonly obstacleOptions = computed(() => toObstacleOptions(this.obstacles()));
  private readonly selectedObstacle = computed(
    () => this.obstacles().find((obstacle) => obstacle.uuid === this.formValue().obstacleUuid) ?? null
  );
  readonly pointOptions = computed(() =>
    toPointOptions(this.selectedObstacle(), (index) =>
      this.translocoService.translate('common.point-index-label', { index: index + 1 })
    )
  );

  private readonly inputs = computed(() => toTemperatureEstimationInputs(this.formValue(), this.selectedObstacle()));

  readonly isCalculating = signal(false);
  readonly canCalculate = computed(() => this.formValid() && this.inputs() !== null && !this.isCalculating());

  private readonly estimation = signal<TemperatureEstimation | null>(null);

  /**
   * Estimated conformity temperature (°C); null hides the results frame. The engine study follows the section:
   * a result calculated on a previous section is not shown.
   */
  readonly temperature = computed(() => {
    const estimation = this.estimation();
    return estimation && estimation.section === this.spanService.section() ? estimation.value : null;
  });

  constructor() {
    // the point list follows the selected obstacle, starting on its first point
    this.form.controls.obstacleUuid.valueChanges.pipe(takeUntilDestroyed()).subscribe((uuid) => {
      const obstacle = this.obstacles().find((candidate) => candidate.uuid === uuid) ?? null;
      this.form.controls.pointIndex.setValue(getDefaultPointIndex(obstacle));
    });

    // results only match the inputs they were calculated from
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.estimation.set(null));

    // the obstacle selected in the Studio is preselected, once the point list follows it
    this.form.controls.obstacleUuid.setValue(
      getPreselectedObstacleUuid(this.obstacles(), this.obstaclesService.selectedMeasureUuid())
    );
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? this.inputs() : null;
    if (!inputs) return;

    const section = this.spanService.section();
    this.isCalculating.set(true);
    // the result must match the inputs it is calculated from
    this.setInputsLocked(true);
    try {
      const { result, error, diagnostics } = await this.workerPythonService.runTask(Task.estimateTemperature, inputs);
      // e.g. BalanceEngineWarning when the study had to be adjusted on the engine side
      for (const warning of formatPythonWarnings(diagnostics, this.translocoService)) {
        this.notificationService.warning(warning);
      }
      if (error || !result) {
        this.logger.error('Failed to estimate the conformity temperature', error);
        this.estimation.set(null);
        this.notificationService.error(
          formatPythonError(diagnostics.find((d) => d.origin === 'exception')?.code ?? null, this.translocoService) ??
            this.translocoService.translate('studio.estimations.calculation-failed')
        );
        return;
      }
      this.estimation.set({ value: result.value, section });
    } catch (error) {
      this.logger.error('Failed to estimate the conformity temperature', error);
      this.estimation.set(null);
      this.notificationService.error(this.translocoService.translate('studio.estimations.calculation-failed'));
    } finally {
      this.setInputsLocked(false);
      this.isCalculating.set(false);
    }
  }

  /** Copies the displayed conformity temperature (without unit) to the clipboard. */
  async copyTemperature(): Promise<void> {
    const temperature = this.temperature();
    if (temperature === null) return;
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard API unavailable');
      await clipboard.writeText(formatNumber(temperature, this.locale, CONFORMITY_TEMPERATURE_FORMAT));
      this.notificationService.success(this.translocoService.translate('common.copied-to-clipboard'));
    } catch (error) {
      this.logger.error('Failed to copy the conformity temperature', error);
      this.notificationService.error(this.translocoService.translate('common.copy-to-clipboard-failed'));
    }
  }

  // without event: the form value and validity are unchanged, and the point stays read-only
  private setInputsLocked(locked: boolean): void {
    for (const control of [this.form.controls.obstacleUuid, this.form.controls.targetDistance]) {
      if (locked) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }
}
