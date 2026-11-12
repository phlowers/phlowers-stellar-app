/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { computed, Directive, inject, LOCALE_ID, Signal, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ObstaclesService } from '@services/obstacles/obstacles.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task, TaskInputs, TaskOutputs } from '@services/worker_python/tasks/types';
import { formatPythonError, formatPythonWarnings } from '@services/worker_python/tasks/python-error-messages';
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { Obstacle } from '@shared/domain/models/obstacle.model';
import { getRequiredNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { NumberInputErrorParams } from '@shared/helpers/formErrors.interfaces';
import { EstimationFormValue, EstimationOutcome } from '@features/studio/estimations/domain/estimations.interfaces';
import {
  getDefaultPointIndex,
  getEstimableObstacles,
  getPreselectedObstacleUuid,
  toObstacleOptions,
  toPointOptions
} from '@features/studio/estimations/presentation/estimations.helpers';

/**
 * Logic shared by the estimation tabs: obstacle point choice, calculation and clipboard copy. Each tab provides its
 * numeric controls, its engine task and the mapping of its form value to the task inputs.
 */
@Directive()
export abstract class EstimationFormBase<TTask extends Task, TValueKey extends string> {
  protected readonly spanService = inject(PlotSpanService);
  private readonly obstaclesService = inject(ObstaclesService);
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

  private readonly obstacleUuidControl = new FormControl<string | null>(null, Validators.required);
  // read-only in these user stories: always the first point of the obstacle
  private readonly pointIndexControl = new FormControl<number | null>(
    { value: null, disabled: true },
    Validators.required
  );

  readonly form = new FormGroup({
    obstacleUuid: this.obstacleUuidControl,
    pointIndex: this.pointIndexControl,
    ...this.createValueControls()
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(map(() => this.rawValue())), {
    initialValue: this.rawValue()
  });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

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

  private readonly inputs = computed(() => this.toInputs(this.formValue(), this.selectedObstacle()));

  readonly isCalculating = signal(false);
  readonly canCalculate = computed(() => this.formValid() && this.inputs() !== null && !this.isCalculating());

  private readonly outcome = signal<EstimationOutcome<TaskOutputs[TTask]> | null>(null);

  /**
   * Engine result; null hides the results frame. The engine study follows the section: a result calculated on a
   * previous section is not shown.
   */
  protected readonly result = computed(() => {
    const outcome = this.outcome();
    return outcome && outcome.section === this.spanService.section() ? outcome.result : null;
  });

  constructor() {
    // the point list follows the selected obstacle, starting on its first point
    this.obstacleUuidControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((uuid) => {
      const obstacle = this.obstacles().find((candidate) => candidate.uuid === uuid) ?? null;
      this.pointIndexControl.setValue(getDefaultPointIndex(obstacle));
    });

    // results only match the inputs they were calculated from
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.outcome.set(null));

    // the obstacle selected in the Studio is preselected, once the point list follows it
    this.obstacleUuidControl.setValue(
      getPreselectedObstacleUuid(this.obstacles(), this.obstaclesService.selectedMeasureUuid())
    );
  }

  /** Numeric controls specific to the estimation. Called while the base is built: must not use subclass fields. */
  protected abstract createValueControls(): Record<TValueKey, FormControl<number | null>>;

  /** Engine inputs of the form value, or null while a value is missing. */
  protected abstract toInputs(
    value: EstimationFormValue<TValueKey>,
    obstacle: Obstacle | null
  ): TaskInputs[TTask] | null;

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? this.inputs() : null;
    if (!inputs) return;

    const section = this.spanService.section();
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
      this.outcome.set({ result, section });
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

  private rawValue(): EstimationFormValue<TValueKey> {
    return this.form.getRawValue() as EstimationFormValue<TValueKey>;
  }

  // without event: the form value and validity are unchanged, and the point stays read-only
  private setInputsLocked(locked: boolean): void {
    for (const control of Object.values<AbstractControl>(this.form.controls)) {
      if (control === this.pointIndexControl) continue;
      if (locked) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    }
  }
}
