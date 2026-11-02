import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { TangentAimingFormBase } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-form.base';
import { TangentAimingHeaderComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-header/tangent-aiming-header.component';
import { TangentAimingNumberFieldComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-number-field/tangent-aiming-number-field.component';
import { TangentAimingResultsComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-results/tangent-aiming-results.component';
import {
  TANGENT_AIMING_INTERIOR_CALCULATION_FAILED_KEY,
  TANGENT_AIMING_INTERIOR_FIELD_RULES,
  TANGENT_AIMING_INTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_INTERIOR_NUMBER_FIELDS
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.constantes';
import {
  createTangentAimingInteriorForm,
  getDisplayedInputFields,
  invalidateTangentAimingInteriorResult,
  toTangentAimingInteriorInputs
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.helpers';
import {
  TangentAimingInteriorCalculationType,
  TangentAimingInteriorForm
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.interfaces';

/** Form for the tangent aiming (interior) parameter calculation. */
@Component({
  selector: 'app-tangent-aiming-interior',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    SelectModule,
    SelectButtonModule,
    MessageModule,
    IconComponent,
    ButtonComponent,
    DecimalPipe,
    TranslocoModule,
    TangentAimingHeaderComponent,
    TangentAimingNumberFieldComponent,
    TangentAimingResultsComponent
  ],
  templateUrl: './tangent-aiming-interior.component.html',
  styleUrl: './tangent-aiming-interior.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TangentAimingInteriorComponent extends TangentAimingFormBase {
  readonly mandatoryId = 'mandatory-tangent-aiming-interior';
  readonly fields = TANGENT_AIMING_INTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_INTERIOR_FIELD_RULES;
  readonly form = this.config.form as TangentAimingInteriorForm;

  readonly showParameterField = computed(() => this.measureData().interiorCalculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().interiorCalculationType === 'tangente');

  constructor() {
    super({
      form: createTangentAimingInteriorForm(),
      modelFields: TANGENT_AIMING_INTERIOR_MODEL_FIELDS,
      leftSupportKey: 'interiorLeftSupport',
      calculationTypeKey: 'interiorCalculationType',
      outputKey: 'tangentAimingInterior',
      logLabel: 'interior',
      calculationFailedKey: TANGENT_AIMING_INTERIOR_CALCULATION_FAILED_KEY,
      getDisplayedInputFields,
      invalidateResult: invalidateTangentAimingInteriorResult,
      toInputs: toTangentAimingInteriorInputs
    });
  }

  updateCalculationType(interiorCalculationType: TangentAimingInteriorCalculationType): void {
    this.measureData.update((d) => invalidateTangentAimingInteriorResult({ ...d, interiorCalculationType }));
  }
}
