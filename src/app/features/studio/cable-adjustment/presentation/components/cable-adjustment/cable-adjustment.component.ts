/**
 * Copyright (c) 2026, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { NotificationService } from '@core/services/notification/notification.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { CableAdjustmentResult } from '@shared/domain';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import {
  ANGLE_DECIMALS,
  ANGLE_FIELDS,
  ANGLE_MAX,
  ANGLE_MIN,
  DISTANCE_DECIMALS,
  DISTANCE_MAX,
  DISTANCE_MIN,
  PARAMETER_DECIMALS,
  PARAMETER_MAX,
  PARAMETER_MIN,
  SUPPORT_OPTIONS
} from '@features/studio/cable-adjustment/domain/cable-adjustment.constantes';
import {
  CableAdjustmentSpan,
  CableAdjustmentSupportSide
} from '@features/studio/cable-adjustment/domain/cable-adjustment.interfaces';
import {
  createAngleControl,
  getSpanLength,
  toCableAdjustmentInputs,
  toDisplayedResults
} from '@features/studio/cable-adjustment/presentation/cable-adjustment.helpers';

@Component({
  selector: 'app-cable-adjustment',
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
  templateUrl: './cable-adjustment.component.html',
  styleUrl: './cable-adjustment.component.scss'
})
/** Dialog computing the sighting angles at mid-span sag used to adjust a cable (US.REG). */
export class CableAdjustmentComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly translocoService = inject(TranslocoService);
  private readonly notificationService = inject(NotificationService);
  private readonly logger = inject(LoggerService);
  readonly spanService = inject(PlotSpanService);

  readonly ANGLE_FIELDS = ANGLE_FIELDS;
  readonly ANGLE_MIN = ANGLE_MIN;
  readonly ANGLE_MAX = ANGLE_MAX;
  readonly ANGLE_STEP = 10 ** -ANGLE_DECIMALS;
  readonly DISTANCE_MIN = DISTANCE_MIN;
  readonly DISTANCE_MAX = DISTANCE_MAX;
  readonly DISTANCE_STEP = 10 ** -DISTANCE_DECIMALS;
  readonly PARAMETER_MIN = PARAMETER_MIN;
  readonly PARAMETER_MAX = PARAMETER_MAX;

  readonly form = new FormGroup({
    span: new FormControl<CableAdjustmentSpan | null>(null, Validators.required),
    leftHorizontalAngle: createAngleControl(),
    rightHorizontalAngle: createAngleControl(),
    leftVerticalAngle: createAngleControl(),
    rightVerticalAngle: createAngleControl(),
    support: new FormControl<CableAdjustmentSupportSide | null>({ value: null, disabled: true }, Validators.required),
    tacheometerHorizontalDistance: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(DISTANCE_MIN),
      Validators.max(DISTANCE_MAX),
      maxDecimalsValidator(DISTANCE_DECIMALS)
    ]),
    adjustmentParameter: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(PARAMETER_MIN),
      Validators.max(PARAMETER_MAX),
      maxDecimalsValidator(PARAMETER_DECIMALS)
    ])
  });

  private readonly selectedSpan = toSignal(this.form.controls.span.valueChanges, { initialValue: null });
  private readonly formValid = toSignal(this.form.statusChanges.pipe(map(() => this.form.valid)), {
    initialValue: this.form.valid
  });

  // RG.REG.SUP.1-2: no side to pick without span
  readonly supportOptions = computed(() =>
    this.selectedSpan()
      ? SUPPORT_OPTIONS.map(({ labelKey, value }) => ({ label: this.translocoService.translate(labelKey), value }))
      : []
  );
  readonly spanLength = computed(() => getSpanLength(this.spanService.section(), this.selectedSpan()?.index ?? null));

  readonly isCalculating = signal(false);
  readonly canCalculate = computed(() => this.formValid() && this.spanLength() !== null && !this.isCalculating());

  readonly results = signal<CableAdjustmentResult | null>(null);
  readonly displayedResults = computed(() => {
    const results = this.results();
    return results ? toDisplayedResults(results) : null;
  });

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    // RG.REG.SUP.1-2: the support list follows the selected span
    this.form.controls.span.valueChanges.pipe(takeUntilDestroyed()).subscribe((span) => {
      this.form.controls.support.reset({ value: null, disabled: span === null });
    });

    // RG.REG.RES-CAD.1: results only match the inputs they were calculated from
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.results.set(null));

    // RG.REG.POR.3: the current span is the first span of the section
    this.form.controls.span.setValue(this.spanService.getSpanOptionsWithIndex()[0]?.value ?? null);
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    const inputs = this.canCalculate() ? toCableAdjustmentInputs(this.form.getRawValue(), this.spanLength()) : null;
    if (!inputs) return;

    this.isCalculating.set(true);
    try {
      const { result, error } = await this.workerPythonService.runTask(Task.calculateCableAdjustment, inputs);
      if (error) throw new Error(error);
      this.results.set(result);
    } catch (error) {
      this.logger.error('Failed to calculate the cable adjustment', error);
      this.results.set(null);
      this.notificationService.error(this.translocoService.translate('studio.cable-adjustment.calculation-failed'));
    } finally {
      this.isCalculating.set(false);
    }
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }
}
