import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { FieldMeasure, TangentAimingSupportResult } from '@features/studio/field-measuring/domain/types';
import {
  buildCantonSupportOptions,
  getDefaultLeftSupport
} from '../tangent-aiming-support/tangent-aiming-support.helpers';
import {
  TANGENT_AIMING_EXTERIOR_FIELD_RULES,
  TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS
} from './tangent-aiming-exterior.constantes';
import { createTangentAimingExteriorForm, syncDisplayedControls } from './tangent-aiming-exterior.helpers';
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
/** Form for the tangent aiming (exterior) parameter calculation (inputs only, calculation not implemented yet). */
export class TangentAimingExteriorComponent {
  /** Field measure, read-only: provides the current span (default left support, calculated span length). */
  measureData = input.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly translocoService = inject(TranslocoService);
  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang()
  });

  readonly fields = TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_EXTERIOR_FIELD_RULES;
  readonly form = createTangentAimingExteriorForm();
  readonly calculationType = signal<TangentAimingExteriorCalculationType>('parametre');
  readonly isFormValid = signal(false);
  /** Calculation result; stays empty until the calculation is implemented. */
  readonly result = signal<TangentAimingSupportResult | null>(null);

  /** Every support of the section. */
  readonly supportOptions = computed(() => buildCantonSupportOptions(this.spanService.section()?.supports ?? []));
  readonly showParameterField = computed(() => this.calculationType() === 'parametre');
  readonly showTangentAngleField = computed(() => this.calculationType() === 'tangente');

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
    effect(() => {
      const defaultLeftSupport = getDefaultLeftSupport(this.measureData().span);
      if (this.form.controls.leftSupport.value === null && defaultLeftSupport !== null) {
        this.form.controls.leftSupport.setValue(defaultLeftSupport);
      }
    });

    effect(() => {
      syncDisplayedControls(this.form, this.calculationType());
      this.isFormValid.set(this.form.valid);
    });

    // A change of input invalidates the previous result.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.isFormValid.set(this.form.valid);
      this.result.set(null);
    });
  }

  updateCalculationType(calculationType: TangentAimingExteriorCalculationType): void {
    this.calculationType.set(calculationType);
    this.result.set(null);
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    if (!control.touched && !control.dirty) return '';
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  /** Calculation is out of scope for now: only reveals the validation errors. */
  calculate(): void {
    this.form.markAllAsTouched();
  }
}
