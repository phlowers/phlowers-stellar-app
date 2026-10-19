import { ChangeDetectionStrategy, Component, computed, effect, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageModule } from 'primeng/message';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { LoggerService } from '@core/services/logger/logger.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import {
  TANGENT_AIMING_SUPPORT_FIELD_RULES,
  TANGENT_AIMING_SUPPORT_NUMBER_FIELDS
} from './tangent-aiming-support.constantes';
import {
  buildSpanSupportOptions,
  calculateTangentAimingSupportMock,
  createTangentAimingSupportForm,
  getDisplayedInputFields,
  resolveLeftSupport,
  syncDisplayedControls,
  toTangentAimingSupportInputs
} from './tangent-aiming-support.helpers';

@Component({
  selector: 'app-tangent-aiming-support',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgTemplateOutlet,
    SelectModule,
    SelectButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule
  ],
  templateUrl: './tangent-aiming-support.component.html',
  styleUrl: './tangent-aiming-support.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for the tangent aiming (support) parameter calculation. */
export class TangentAimingSupportComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly logger = inject(LoggerService);
  private readonly notificationService = inject(NotificationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly fields = TANGENT_AIMING_SUPPORT_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_SUPPORT_FIELD_RULES;
  readonly form = createTangentAimingSupportForm();
  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);

  /** Both supports of the selected span, empty without span (RG.VIS-SUP.SUP.1/2). */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );
  readonly showParameterField = computed(() => this.measureData().calculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().calculationType === 'tangente');

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() => {
    const span = this.measureData().span;
    const lengths = this.plotService.litData()?.output_parameters.span_length;
    return span?.length === 2 ? (lengths?.[span[0]] ?? null) : null;
  });

  readonly calculationTypeOptions = computed(() => {
    this.activeLang();
    return [
      {
        label: this.translocoService.translate('common.parameter-label'),
        value: 'parametre'
      },
      {
        label: this.translocoService.translate('common.calculation-type-tangent'),
        value: 'tangente'
      }
    ];
  });

  constructor() {
    // A span change must not leave a left support outside the span (RG.VIS-SUP.SUP.3).
    effect(() => {
      const { tangentLeftSupport, span } = this.measureData();
      const resolved = resolveLeftSupport(tangentLeftSupport, span);
      if (resolved !== tangentLeftSupport) {
        this.measureData.update((d) => ({
          ...d,
          tangentLeftSupport: resolved,
          outputs: { ...d.outputs, tangentAimingSupport: null }
        }));
      }
    });

    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const data = this.measureData();
      syncDisplayedControls(this.form, data.calculationType);
      for (const field of getDisplayedInputFields(data.calculationType)) {
        const value = data[field] ?? null;
        if (this.form.controls[field].value !== value) {
          this.form.controls[field].setValue(value as never, { emitEvent: false });
        }
      }
      this.isFormValid.set(this.form.valid);
    });

    // Form -> model: a change of input invalidates the previous result.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isFormValid.set(this.form.valid);
      const values = this.form.getRawValue();
      this.measureData.update((d) => ({
        ...d,
        ...Object.fromEntries(getDisplayedInputFields(d.calculationType).map((field) => [field, values[field]])),
        outputs: { ...d.outputs, tangentAimingSupport: null }
      }));
    });
  }

  updateCalculationType(calculationType: FieldMeasure['calculationType']): void {
    this.measureData.update((d) => ({
      ...d,
      calculationType,
      outputs: { ...d.outputs, tangentAimingSupport: null }
    }));
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    if (!control.touched && !control.dirty) return '';
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  async calculate(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.isFormValid() || this.isCalculating()) return;

    this.isCalculating.set(true);
    this.hasError.set(false);
    try {
      const { result, error } = await calculateTangentAimingSupportMock(
        toTangentAimingSupportInputs(this.measureData())
      );
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, tangentAimingSupport: result } }));
    } catch (error) {
      this.logger.error('Failed to calculate the tangent aiming (support) parameter', error);
      this.hasError.set(true);
      this.notificationService.error(
        this.translocoService.translate('field-measuring.tangent-aiming-support.calculation-failed')
      );
    } finally {
      this.isCalculating.set(false);
    }
  }
}
