/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, Directive, inject, LOCALE_ID, Signal, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AbstractControl, FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { formatPythonError, formatPythonWarnings } from '@services/worker_python/tasks/python-error-messages';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { getRequiredNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { NumberInputErrorParams } from '@shared/helpers/formErrors.interfaces';
import { EstimationOutcome } from '@features/studio/estimations/domain/estimations.interfaces';

/**
 * Logic shared by every estimation tab: calculation, result validity and clipboard copy. Each tab provides its form,
 * its engine task and the mapping of its form value to the task inputs.
 */
@Directive()
export abstract class EstimationCalculationBase<TTask extends Task, TForm extends FormGroup, TValue> {
  protected readonly spanService = inject(PlotSpanService);
  private readonly loadFormsService = inject(LoadFormsService);
  private readonly workerPythonService = inject(WorkerPythonService);
  protected readonly translocoService = inject(TranslocoService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  private readonly document = inject(DOCUMENT);
  protected readonly locale = inject(LOCALE_ID);

  /** Engine task of the estimation. */
  protected abstract readonly task: TTask;
  /** Transloco key of the message shown when the calculation fails without engine diagnostic. */
  protected abstract readonly calculationFailedKey: string;
  /** Technical log message of a calculation failure. */
  protected abstract readonly calculationFailedLog: string;

  readonly form: TForm = this.createForm();

  protected readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.rawValue())), {
    initialValue: this.rawValue()
  });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

  private readonly inputs = computed(() => this.toInputs(this.formValue()));

  readonly isCalculating = signal(false);
  // The section is published before the engine holds its study and load case: calculating then would use the previous
  // (or a partially updated) study
  readonly canCalculate = computed(
    () =>
      this.loadFormsService.isEngineSynchronized() &&
      this.formValid() &&
      this.inputs() !== null &&
      !this.isCalculating()
  );

  private readonly outcome = signal<EstimationOutcome<TaskOutputs[TTask]> | null>(null);

  /**
   * Engine result; null hides the results frame. The engine study follows the section and the load case: a result
   * calculated on a previous section, or before the engine study or load case changed, is not shown.
   */
  protected readonly result = computed(() => {
    const outcome = this.outcome();
    return outcome?.section === this.spanService.section() &&
      outcome?.engineRevision === this.loadFormsService.engineRevision()
      ? outcome.result
      : null;
  });

  constructor() {
    // results only match the inputs they were calculated from
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.outcome.set(null));
  }

  /** Form of the estimation. Called while the base is built: must not use subclass fields. */
  protected abstract createForm(): TForm;

  /** Engine inputs of the form value, or null while a value is missing. */
  protected abstract toInputs(value: TValue): TaskInputs[TTask] | null;

  /** Controls disabled while the calculation runs; override to keep a control as it is. */
  protected isLockedWhileCalculating(_control: AbstractControl): boolean {
    return true;
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? this.inputs() : null;
    if (!inputs) return;

    const section = this.spanService.section();
    const engineRevision = this.loadFormsService.engineRevision();
    this.isCalculating.set(true);
    // the result must match the inputs it is calculated from
    this.setInputsLocked(true);
    try {
      const { result, error, diagnostics } = await this.workerPythonService.runTask(this.task, inputs);
      // e.g. BalanceEngineWarning when the study had to be adjusted on the engine side
      for (const warning of formatPythonWarnings(diagnostics, this.translocoService)) {
        this.notificationService.warning(warning);
      }
      if (error || !result) {
        this.logger.error(this.calculationFailedLog, error);
        this.outcome.set(null);
        this.notificationService.error(
          formatPythonError(diagnostics.find((d) => d.origin === 'exception')?.code ?? null, this.translocoService) ??
            this.translocoService.translate(this.calculationFailedKey)
        );
        return;
      }
      this.outcome.set({ result, section, engineRevision });
    } catch (error) {
      this.logger.error(this.calculationFailedLog, error);
      this.outcome.set(null);
      this.notificationService.error(this.translocoService.translate(this.calculationFailedKey));
    } finally {
      this.setInputsLocked(false);
      this.isCalculating.set(false);
    }
  }

  /** Error of a numeric control, once edited or touched. Must be called in an injection context. */
  protected numberInputError(control: FormControl<number | null>): Signal<NumberInputErrorParams | null> {
    return toSignal(
      control.events.pipe(
        map(() => (control.dirty || control.touched ? getRequiredNumberInputErrorParams(control) : null))
      ),
      { initialValue: null }
    );
  }

  /** Copies a displayed result to the clipboard, notifying the outcome. */
  protected async copyToClipboard(text: string): Promise<void> {
    try {
      const clipboard = this.document.defaultView?.navigator.clipboard;
      if (!clipboard) throw new Error('Clipboard API unavailable');
      await clipboard.writeText(text);
      this.notificationService.success(this.translocoService.translate('common.copied-to-clipboard'));
    } catch (error) {
      this.logger.error('Failed to copy the estimation result', error);
      this.notificationService.error(this.translocoService.translate('common.copy-to-clipboard-failed'));
    }
  }

  private rawValue(): TValue {
    return this.form.getRawValue() as TValue;
  }

  // without event: the form value and validity are unchanged
  private setInputsLocked(locked: boolean): void {
    for (const control of Object.values<AbstractControl>(this.form.controls)) {
      if (!this.isLockedWhileCalculating(control)) continue;
      if (locked) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }
}
