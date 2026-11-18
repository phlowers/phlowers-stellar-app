/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoModule } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { PlotOptionsService } from '@services/plot/plot-options.service';
import { Task } from '@services/worker_python/tasks/types';
import { createNumberControl, maxDecimalsValidator } from '@shared/helpers/numberValidators';
import {
  findCurrentSpanOption,
  getSpanLength
} from '@features/studio/cable-adjustment/presentation/cable-adjustment.helpers';
import {
  CABLE_TEMPERATURE_DECIMALS,
  CABLE_TEMPERATURE_LIMITS,
  DEFAULT_EFFORT_DIRECTION,
  EFFORT_DIRECTION_OPTIONS,
  EFFORT_DISTANCE_DECIMALS,
  EFFORT_DISTANCE_DEFAULT,
  EFFORT_DISTANCE_MIN,
  EFFORT_INPUT_LIMITS,
  EFFORT_RESULT_FORMAT,
  EFFORT_TARGET_DISPLACEMENT_DECIMALS,
  EFFORT_TARGET_DISPLACEMENT_DEFAULT,
  EFFORT_TARGET_DISPLACEMENT_MAX,
  EFFORT_TARGET_DISPLACEMENT_MIN
} from '@features/studio/estimations/domain/estimations.constantes';
import {
  EffortDirection,
  EffortEstimationForm,
  EffortEstimationFormValue,
  EstimationSpan,
  EstimationSupportSide
} from '@features/studio/estimations/domain/estimations.interfaces';
import {
  formatEffortForClipboard,
  maxLengthValidator,
  roundEffortResult,
  toEffortEstimationInputs
} from '@features/studio/estimations/presentation/estimations.helpers';
import { EstimationCalculationBase } from '@features/studio/estimations/presentation/estimation-calculation.base';

/**
 * "Vertical cable displacement effort" tab: estimates the traction or the weight to apply at a point of a span for
 * the cable to move by a target vertical displacement at a cable temperature (US.EST.PDS-TRA).
 */
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
export class EffortEstimationComponent extends EstimationCalculationBase<
  Task.estimateEffort,
  EffortEstimationForm,
  EffortEstimationFormValue
> {
  private readonly plotOptionsService = inject(PlotOptionsService);

  protected readonly task = Task.estimateEffort;
  protected readonly calculationFailedKey = 'studio.estimations.effort-calculation-failed';
  protected readonly calculationFailedLog = 'Failed to estimate the cable effort';

  readonly limits = EFFORT_INPUT_LIMITS;
  readonly temperatureLimits = CABLE_TEMPERATURE_LIMITS;
  readonly directionOptions = EFFORT_DIRECTION_OPTIONS;
  readonly resultFormat = EFFORT_RESULT_FORMAT;

  readonly spanOptions = this.spanService.getSpanOptionsWithIndex;
  // empty without span
  readonly supportOptions = computed(() => this.spanService.getSupportOptions(this.formValue().span?.uuid ?? null));
  // the distance to the reference support cannot exceed it
  readonly spanLength = computed(() => getSpanLength(this.spanService.section(), this.formValue().span?.index ?? null));

  /** Errors of the numeric inputs, once edited or touched. */
  readonly distanceError = this.numberInputError(this.form.controls.distanceToReferenceSupport);
  readonly temperatureError = this.numberInputError(this.form.controls.temperature);
  readonly targetDisplacementError = this.numberInputError(this.form.controls.targetDisplacement);

  /** Estimated effort (daN, negative for a traction) rounded as displayed; null hides the results frame. */
  readonly effort = computed(() => {
    const result = this.result();
    return result ? roundEffortResult(result.effort) : null;
  });

  /** Displacement (m) of the application point along the span axis, rounded as displayed. */
  readonly axisDisplacement = computed(() => {
    const result = this.result();
    return result ? roundEffortResult(result.axisDisplacement) : null;
  });

  constructor() {
    super();
    // the support list follows the selected span, starting on its departure support
    this.form.controls.span.valueChanges.pipe(takeUntilDestroyed()).subscribe((span) => {
      this.form.controls.referenceSupport.reset({ value: span ? 'LEFT' : null, disabled: span === null });
      this.form.controls.distanceToReferenceSupport.updateValueAndValidity();
    });

    // the current span is the first displayed span of the studio
    this.form.controls.span.setValue(
      findCurrentSpanOption(this.spanOptions(), this.plotOptionsService.plotOptions().startSupport)
    );
  }

  /** Copies the displayed effort (without unit nor group separator) to the clipboard. */
  async copyEffort(): Promise<void> {
    const effort = this.effort();
    if (effort === null) return;
    await this.copyToClipboard(formatEffortForClipboard(effort, this.locale));
  }

  protected createForm(): EffortEstimationForm {
    return new FormGroup({
      span: new FormControl<EstimationSpan | null>(null, Validators.required),
      referenceSupport: new FormControl<EstimationSupportSide | null>(
        { value: null, disabled: true },
        Validators.required
      ),
      distanceToReferenceSupport: new FormControl<number | null>(EFFORT_DISTANCE_DEFAULT, [
        Validators.required,
        Validators.min(EFFORT_DISTANCE_MIN),
        maxLengthValidator((control) => this.spanLengthOf(control)),
        maxDecimalsValidator(EFFORT_DISTANCE_DECIMALS)
      ]),
      temperature: createNumberControl(
        CABLE_TEMPERATURE_LIMITS.min,
        CABLE_TEMPERATURE_LIMITS.max,
        CABLE_TEMPERATURE_DECIMALS
      ),
      direction: new FormControl<EffortDirection>(DEFAULT_EFFORT_DIRECTION, { nonNullable: true }),
      targetDisplacement: createNumberControl(
        EFFORT_TARGET_DISPLACEMENT_MIN,
        EFFORT_TARGET_DISPLACEMENT_MAX,
        EFFORT_TARGET_DISPLACEMENT_DECIMALS,
        EFFORT_TARGET_DISPLACEMENT_DEFAULT
      )
    });
  }

  protected toInputs(value: EffortEstimationFormValue) {
    return toEffortEstimationInputs(value, this.spanLength());
  }

  // Method, not field: the validators run while the base builds the form, before the subclass fields exist
  private spanLengthOf(control: AbstractControl): number | null {
    const span: EstimationSpan | null = control.parent?.get('span')?.value ?? null;
    return getSpanLength(this.spanService.section(), span?.index ?? null);
  }
}
