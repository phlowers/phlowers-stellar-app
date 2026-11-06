/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Clipboard } from '@angular/cdk/clipboard';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { PythonDiagnostic } from '@services/worker_python/tasks/python-diagnostic.interfaces';
import { formatPythonError } from '@services/worker_python/tasks/python-error-messages';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { createNumberControl } from '@features/studio/cable-adjustment/presentation/cable-adjustment.helpers';
import {
  TARGET_DISTANCE_DECIMALS,
  TARGET_DISTANCE_MAX,
  TARGET_DISTANCE_MIN,
  TEMPERATURE_INPUT_LIMITS
} from '@features/studio/estimations/domain/temperature-estimation.constantes';
import {
  formatResultForClipboard,
  roundResult
} from '@features/studio/estimations/presentation/effort-estimation.helpers';
import {
  toEstimateTemperatureInputs,
  toObstacleOptions,
  toPointOptions
} from '@features/studio/estimations/presentation/temperature-estimation.helpers';

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
/** Estimation of the cable temperature giving a target distance to a point of an obstacle (US.EST.TCO). */
export class TemperatureEstimationComponent {
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly translocoService = inject(TranslocoService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly clipboard = inject(Clipboard);
  private readonly spanService = inject(PlotSpanService);

  readonly limits = TEMPERATURE_INPUT_LIMITS;

  private readonly obstacles = computed(() => this.spanService.section()?.obstacles ?? []);
  readonly obstacleOptions = computed(() => toObstacleOptions(this.obstacles()));

  readonly form = new FormGroup({
    obstacleUuid: new FormControl<string | null>(null, Validators.required),
    // the point is not editable yet: it follows the selected obstacle
    pointIndex: new FormControl<number | null>({ value: null, disabled: true }, Validators.required),
    targetDistance: createNumberControl(TARGET_DISTANCE_MIN, TARGET_DISTANCE_MAX, TARGET_DISTANCE_DECIMALS)
  });

  private readonly selectedObstacleUuid = toSignal(this.form.controls.obstacleUuid.valueChanges, {
    initialValue: null
  });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

  // empty without obstacle
  readonly pointOptions = computed(() =>
    toPointOptions(
      this.obstacles().find((obstacle) => obstacle.uuid === this.selectedObstacleUuid()),
      (pointNumber) => this.translocoService.translate('common.point-index-label', { index: pointNumber })
    )
  );
  readonly hasObstacle = computed(() => this.selectedObstacleUuid() !== null);

  readonly isCalculating = signal(false);
  // The displayed result matches the inputs until one of them is modified
  private readonly resultMatchesInputs = signal(false);
  readonly canCalculate = computed(() => this.formValid() && !this.isCalculating() && !this.resultMatchesInputs());

  private readonly temperature = signal<number | null>(null);
  readonly displayedTemperature = computed(() => {
    const temperature = this.temperature();
    return temperature === null ? null : roundResult(temperature);
  });

  constructor() {
    // the point follows the selected obstacle, starting on its first point
    this.form.controls.obstacleUuid.valueChanges.pipe(takeUntilDestroyed()).subscribe((obstacleUuid) => {
      this.form.controls.pointIndex.reset({ value: obstacleUuid ? 0 : null, disabled: true });
    });

    // the result stays displayed, only the calculation is allowed again
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.resultMatchesInputs.set(false));
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? toEstimateTemperatureInputs(this.form.getRawValue(), this.obstacles()) : null;
    if (!inputs) return;

    this.isCalculating.set(true);
    // No events: enabling back would otherwise allow a new calculation on unchanged inputs
    this.form.disable({ emitEvent: false });
    let diagnostics: PythonDiagnostic[] = [];
    try {
      const outcome = await this.workerPythonService.runTask(Task.estimateTemperature, inputs);
      diagnostics = outcome.diagnostics ?? [];
      if (outcome.error) throw new Error(outcome.error);
      this.temperature.set(outcome.result.value);
      this.resultMatchesInputs.set(true);
    } catch (error) {
      this.logger.error('Failed to estimate the conformity temperature', error);
      this.temperature.set(null);
      // Prefer the message matching the Python error raised by the task, if any
      const pythonErrorMessage = formatPythonError(
        diagnostics.find((diagnostic) => diagnostic.origin === 'exception')?.code ?? null,
        this.translocoService
      );
      this.notificationService.error(
        pythonErrorMessage ?? this.translocoService.translate('common.error-occurred-label')
      );
    } finally {
      this.form.enable({ emitEvent: false });
      this.form.controls.pointIndex.disable({ emitEvent: false });
      this.isCalculating.set(false);
    }
  }

  copyToClipboard(value: number): void {
    if (this.clipboard.copy(formatResultForClipboard(value))) {
      this.notificationService.success(this.translocoService.translate('studio.temperature-estimation.copied'));
    } else {
      this.notificationService.error(this.translocoService.translate('studio.temperature-estimation.copy-failed'));
    }
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }
}
