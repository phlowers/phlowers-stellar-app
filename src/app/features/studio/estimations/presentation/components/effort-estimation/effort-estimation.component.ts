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
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { CableEffortDirection, CableEffortResult } from '@shared/domain';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import {
  createNumberControl,
  findCurrentSpanOption
} from '@features/studio/cable-adjustment/presentation/cable-adjustment.helpers';
import {
  DEFAULT_DIRECTION,
  DIRECTION_OPTIONS,
  DISPLACEMENT_DECIMALS,
  DISPLACEMENT_DEFAULT,
  DISPLACEMENT_MAX,
  DISPLACEMENT_MIN,
  DISTANCE_DECIMALS,
  DISTANCE_DEFAULT,
  DISTANCE_MAX,
  DISTANCE_MIN,
  INPUT_LIMITS,
  TEMPERATURE_DECIMALS,
  TEMPERATURE_DEFAULT,
  TEMPERATURE_MAX,
  TEMPERATURE_MIN
} from '@features/studio/estimations/domain/effort-estimation.constantes';
import {
  EffortEstimationSpan,
  EffortEstimationSupportSide
} from '@features/studio/estimations/domain/effort-estimation.interfaces';
import {
  formatResultForClipboard,
  toCableEffortInputs,
  toDisplayedResults
} from '@features/studio/estimations/presentation/effort-estimation.helpers';

@Component({
  selector: 'app-effort-estimation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    TranslocoModule,
    SelectModule,
    SelectButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent
  ],
  templateUrl: './effort-estimation.component.html',
  styleUrl: './effort-estimation.component.scss'
})
/** Estimation of the effort (traction or weight) displacing the cable of a span by a target distance (US.EST.PDS-TRA). */
export class EffortEstimationComponent {
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly translocoService = inject(TranslocoService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly clipboard = inject(Clipboard);
  private readonly plotOptionsService = inject(PlotOptionsService);
  readonly spanService = inject(PlotSpanService);

  readonly limits = INPUT_LIMITS;
  readonly directionOptions = DIRECTION_OPTIONS;

  readonly form = new FormGroup({
    span: new FormControl<EffortEstimationSpan | null>(null, Validators.required),
    referenceSupport: new FormControl<EffortEstimationSupportSide | null>(
      { value: null, disabled: true },
      Validators.required
    ),
    distanceToReferenceSupport: createNumberControl(DISTANCE_MIN, DISTANCE_MAX, DISTANCE_DECIMALS, DISTANCE_DEFAULT),
    temperature: createNumberControl(TEMPERATURE_MIN, TEMPERATURE_MAX, TEMPERATURE_DECIMALS, TEMPERATURE_DEFAULT),
    direction: new FormControl<CableEffortDirection>(DEFAULT_DIRECTION, { nonNullable: true }),
    targetDisplacement: createNumberControl(
      DISPLACEMENT_MIN,
      DISPLACEMENT_MAX,
      DISPLACEMENT_DECIMALS,
      DISPLACEMENT_DEFAULT
    )
  });

  private readonly selectedSpan = toSignal(this.form.controls.span.valueChanges, { initialValue: null });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

  // empty without span
  readonly supportOptions = computed(() => this.spanService.getSupportOptions(this.selectedSpan()?.uuid ?? null));

  readonly isCalculating = signal(false);
  // The displayed results match the inputs until one of them is modified
  private readonly resultsMatchInputs = signal(false);
  readonly canCalculate = computed(() => this.formValid() && !this.isCalculating() && !this.resultsMatchInputs());

  readonly results = signal<CableEffortResult | null>(null);
  readonly displayedResults = computed(() => {
    const results = this.results();
    return results ? toDisplayedResults(results) : null;
  });

  constructor() {
    // the support list follows the selected span, starting on its departure support
    this.form.controls.span.valueChanges.pipe(takeUntilDestroyed()).subscribe((span) => {
      this.form.controls.referenceSupport.reset({ value: span ? 'LEFT' : null, disabled: span === null });
    });

    // the results stay displayed, only the calculation is allowed again
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.resultsMatchInputs.set(false));

    // the current span is the first displayed span of the studio
    this.form.controls.span.setValue(
      findCurrentSpanOption(
        this.spanService.getSpanOptionsWithIndex(),
        this.plotOptionsService.plotOptions().startSupport
      )
    );
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? toCableEffortInputs(this.form.getRawValue()) : null;
    if (!inputs) return;

    this.isCalculating.set(true);
    // No events: enabling back would otherwise allow a new calculation on unchanged inputs
    this.form.disable({ emitEvent: false });
    try {
      const { result, error } = await this.workerPythonService.runTask(Task.estimateCableEffort, inputs);
      if (error) throw new Error(error);
      this.results.set(result);
      this.resultsMatchInputs.set(true);
    } catch (error) {
      this.logger.error('Failed to estimate the cable effort', error);
      this.results.set(null);
      this.notificationService.error(this.translocoService.translate('common.error-occurred-label'));
    } finally {
      this.form.enable({ emitEvent: false });
      this.isCalculating.set(false);
    }
  }

  copyToClipboard(value: number): void {
    if (this.clipboard.copy(formatResultForClipboard(value))) {
      this.notificationService.success(this.translocoService.translate('studio.effort-estimation.copied'));
    } else {
      this.notificationService.error(this.translocoService.translate('studio.effort-estimation.copy-failed'));
    }
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }
}
