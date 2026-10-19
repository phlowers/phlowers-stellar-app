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
import { buildCantonSupportOptions } from '../tangent-aiming-support/tangent-aiming-support.helpers';
import {
  TANGENT_AIMING_EXTERIOR_FIELD_RULES,
  TANGENT_AIMING_EXTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS
} from './tangent-aiming-exterior.constantes';
import {
  calculateTangentAimingExteriorMock,
  createTangentAimingExteriorForm,
  getDisplayedInputFields,
  syncDisplayedControls,
  toTangentAimingExteriorInputs
} from './tangent-aiming-exterior.helpers';
import { TangentAimingExteriorCalculationType } from './tangent-aiming-exterior.interfaces';

@Component({
  selector: 'app-tangent-aiming-exterior',
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
  templateUrl: './tangent-aiming-exterior.component.html',
  styleUrl: './tangent-aiming-exterior.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for the tangent aiming (exterior) parameter calculation. */
export class TangentAimingExteriorComponent {
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

  readonly fields = TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_EXTERIOR_FIELD_RULES;
  readonly form = createTangentAimingExteriorForm();
  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);

  /** Every support of the section. */
  readonly supportOptions = computed(() => buildCantonSupportOptions(this.spanService.section()?.supports ?? []));
  readonly showParameterField = computed(() => this.measureData().exteriorCalculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().exteriorCalculationType === 'tangente');

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() => {
    const span = this.measureData().span;
    const lengths = this.plotService.litData()?.output_parameters.span_length;
    return span?.length === 2 ? (lengths?.[span[0]] ?? null) : null;
  });

  readonly calculationTypeOptions = computed(() => {
    this.activeLang();
    return [
      { label: this.translocoService.translate('common.parameter-label'), value: 'parametre' },
      { label: this.translocoService.translate('common.calculation-type-tangent'), value: 'tangente' }
    ];
  });

  constructor() {
    // Model -> form: only differing values are written, so a value being typed is never overwritten.
    effect(() => {
      const data = this.measureData();
      syncDisplayedControls(this.form, data.exteriorCalculationType);
      for (const field of getDisplayedInputFields(data.exteriorCalculationType)) {
        const value = data[TANGENT_AIMING_EXTERIOR_MODEL_FIELDS[field]] ?? null;
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
        ...Object.fromEntries(
          getDisplayedInputFields(d.exteriorCalculationType).map((field) => [
            TANGENT_AIMING_EXTERIOR_MODEL_FIELDS[field],
            values[field]
          ])
        ),
        outputs: { ...d.outputs, tangentAimingExterior: null }
      }));
    });
  }

  updateCalculationType(exteriorCalculationType: TangentAimingExteriorCalculationType): void {
    this.measureData.update((d) => ({
      ...d,
      exteriorCalculationType,
      outputs: { ...d.outputs, tangentAimingExterior: null }
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
      const { result, error } = await calculateTangentAimingExteriorMock(
        toTangentAimingExteriorInputs(this.measureData())
      );
      if (error || !result) throw new Error(error ?? 'Empty tangent aiming result');
      this.measureData.update((d) => ({ ...d, outputs: { ...d.outputs, tangentAimingExterior: result } }));
    } catch (error) {
      this.logger.error('Failed to calculate the tangent aiming (exterior) parameter', error);
      this.hasError.set(true);
      this.notificationService.error(
        this.translocoService.translate('field-measuring.tangent-aiming-exterior.calculation-failed')
      );
    } finally {
      this.isCalculating.set(false);
    }
  }
}
