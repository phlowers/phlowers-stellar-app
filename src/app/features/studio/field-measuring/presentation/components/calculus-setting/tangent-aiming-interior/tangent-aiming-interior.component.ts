import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { SelectModule } from 'primeng/select';
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
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { buildSpanSupportOptions } from '../tangent-aiming-support/tangent-aiming-support.helpers';
import {
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_NUMBER_FIELDS
} from './tangent-aiming-interior.constantes';
import { createTangentAimingInteriorForm } from './tangent-aiming-interior.helpers';
import { TangentAimingInteriorResult } from './tangent-aiming-interior.interfaces';

@Component({
  selector: 'app-tangent-aiming-interior',
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule
  ],
  templateUrl: './tangent-aiming-interior.component.html',
  styleUrl: './tangent-aiming-interior.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Form for the tangent aiming (interior) parameter calculation. */
export class TangentAimingInteriorComponent {
  /** Field measure data model bound two-way, read only for now. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly translocoService = inject(TranslocoService);

  readonly fields = TANGENT_AIMING_INTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_INTERIOR_FIELD_RULES;
  readonly form = createTangentAimingInteriorForm();
  readonly isFormValid = signal(false);
  readonly isCalculating = signal(false);
  readonly hasError = signal(false);
  readonly result = signal<TangentAimingInteriorResult | null>(null);

  /** Both supports of the selected span, empty without span. */
  readonly supportOptions = computed(() =>
    buildSpanSupportOptions(this.spanService.section()?.supports ?? [], this.measureData().span)
  );

  /** Span length computed by the engine for the selected span, or null when unavailable. */
  readonly calculatedSpanLength = computed(() => {
    const span = this.measureData().span;
    const lengths = this.plotService.litData()?.output_parameters.span_length;
    return span?.length === 2 ? (lengths?.[span[0]] ?? null) : null;
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.isFormValid.set(this.form.valid));
  }

  /** Message of the active error of a control, once it has been touched. */
  getError(control: AbstractControl): string {
    if (!control.touched && !control.dirty) return '';
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  calculate(): void {
    this.form.markAllAsTouched();
    // TODO: calculation logic (second pass).
  }
}
