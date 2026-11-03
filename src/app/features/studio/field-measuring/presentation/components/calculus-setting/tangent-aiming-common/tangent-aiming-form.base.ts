/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, Directive, effect, inject, model, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { INITIAL_LEFT_SUPPORT_STATE } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.constantes';
import {
  buildCalculationTypeOptions,
  buildSpanSupportOptions,
  getCalculatedSpanLength,
  getSpanKey,
  getTangentAimingError,
  nextLeftSupportState,
  syncDisplayedControls
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import { TangentAimingFormConfig } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.interfaces';

/** Logic shared by the tangent aiming forms (support, interior, exterior); each one only provides its config. */
@Directive()
export abstract class TangentAimingFormBase {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  protected readonly plotService = inject(PlotService);
  protected readonly spanService = inject(PlotSpanService);
  protected readonly workerPythonService = inject(WorkerPythonService);
  protected readonly logger = inject(LoggerService);
  protected readonly notificationService = inject(NotificationService);
  protected readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);
  /** Transloco key of the calculation failure message of this form. */
  readonly calculationFailedKey: string;
  private readonly leftSupportState = signal(INITIAL_LEFT_SUPPORT_STATE);

  /** Displayed inputs as of the last calculation, or of the opening of the form while nothing was calculated. */
  private readonly baselineInputs = signal<string | null>(null);

  private readonly displayedInputs = computed(() => {
    const { modelFields, calculationTypeKey, getDisplayedInputFields } = this.config;
    const data = this.measureData();
    const calculationType = data[calculationTypeKey];
    return JSON.stringify([
      calculationType,
      getDisplayedInputFields(calculationType).map((f) => data[modelFields[f]] ?? null)
    ]);
  });

  /** The calculate button is only usable on a valid form whose inputs changed since the last calculation (or opening). */
  readonly canCalculate = computed(() => {
    const baseline = this.baselineInputs();
    return (
      this.isFormValid() &&
      !this.isCalculating() &&
      this.measureData().outputs[this.config.outputKey] === null &&
      baseline !== null &&
      baseline !== this.displayedInputs()
    );
  });

  /** Both supports of the selected span, empty without span. */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() =>
    getCalculatedSpanLength(this.measureData().span, this.plotService.litData()?.output_parameters.span_length)
  );

  readonly calculationTypeOptions = computed(() => {
    this.activeLang();
    return buildCalculationTypeOptions(this.translocoService);
  });

  protected constructor(protected readonly config: TangentAimingFormConfig) {
    const { form, modelFields, leftSupportKey, calculationTypeKey } = config;
    this.calculationFailedKey = config.calculationFailedKey;

    // A span change must not leave a left support outside the span, nor a result computed for another span.
    effect(() => {
      const data = this.measureData();
      const leftSupport = data[leftSupportKey];
      const previous = untracked(this.leftSupportState).previous;
      const { resolved, state } = nextLeftSupportState(leftSupport, data.span, untracked(this.leftSupportState));
      untracked(() => this.leftSupportState.set(state));
      const spanChanged = previous !== null && previous.spanKey !== getSpanKey(data.span);
      if (spanChanged) {
        // The result is stale although no input was edited: a new calculation must be allowed.
        untracked(() => this.baselineInputs.set(''));
      }
      if (resolved !== leftSupport || spanChanged) {
        this.measureData.update((d) => config.invalidateResult({ ...d, [leftSupportKey]: resolved }));
      }
    });

    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const data = this.measureData();
      untracked(() => this.baselineInputs.update((baseline) => baseline ?? this.displayedInputs()));
      const displayed = config.getDisplayedInputFields(data[calculationTypeKey]);
      syncDisplayedControls(form, displayed);
      for (const field of displayed) {
        const value = data[modelFields[field]] ?? null;
        if (form.controls[field].value !== value) {
          form.controls[field].setValue(value as never, { emitEvent: false });
        }
      }
      this.isFormValid.set(form.valid);
    });

    // Form -> model: a change of input invalidates the previous result.
    form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isFormValid.set(form.valid);
      const values = form.getRawValue();
      this.measureData.update((d) =>
        config.invalidateResult({
          ...d,
          ...Object.fromEntries(
            config.getDisplayedInputFields(d[calculationTypeKey]).map((field) => [modelFields[field], values[field]])
          )
        })
      );
    });
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    return getTangentAimingError(control, this.translocoService);
  }

  async calculate(): Promise<void> {
    this.config.form.markAllAsTouched();
    if (!this.isFormValid() || this.isCalculating()) return;

    this.isCalculating.set(true);
    this.hasError.set(false);
    try {
      const { result, error } = await this.workerPythonService.runTask(
        Task.calculateTangentAiming,
        this.config.toTaskInputs(this.measureData())
      );
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, [this.config.outputKey]: result } }));
      this.baselineInputs.set(this.displayedInputs());
    } catch (error) {
      this.logger.error(`Failed to calculate the tangent aiming (${this.config.logLabel}) parameter`, error);
      this.hasError.set(true);
      this.notificationService.error(this.translocoService.translate(this.calculationFailedKey));
    } finally {
      this.isCalculating.set(false);
    }
  }
}
