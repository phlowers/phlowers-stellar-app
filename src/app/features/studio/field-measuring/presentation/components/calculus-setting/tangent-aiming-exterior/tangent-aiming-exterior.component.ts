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
  TANGENT_AIMING_EXTERIOR_CALCULATION_FAILED_KEY,
  TANGENT_AIMING_EXTERIOR_FIELD_RULES,
  TANGENT_AIMING_EXTERIOR_MODEL_FIELDS,
  TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.constantes';
import {
  createTangentAimingExteriorForm,
  getDisplayedInputFields,
  invalidateTangentAimingExteriorResult,
  toTangentAimingExteriorInputs
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.helpers';
import {
  TangentAimingExteriorCalculationType,
  TangentAimingExteriorForm
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-exterior/tangent-aiming-exterior.interfaces';

/** Form for the tangent aiming (exterior) parameter calculation. */
@Component({
  selector: 'app-tangent-aiming-exterior',
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
  templateUrl: './tangent-aiming-exterior.component.html',
  styleUrl: './tangent-aiming-exterior.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TangentAimingExteriorComponent extends TangentAimingFormBase {
  readonly mandatoryId = 'mandatory-tangent-aiming-exterior';
  readonly fields = TANGENT_AIMING_EXTERIOR_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_EXTERIOR_FIELD_RULES;
  readonly form = this.config.form as TangentAimingExteriorForm;

  readonly showParameterField = computed(() => this.measureData().exteriorCalculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().exteriorCalculationType === 'tangente');

  constructor() {
    super({
      form: createTangentAimingExteriorForm(),
      modelFields: TANGENT_AIMING_EXTERIOR_MODEL_FIELDS,
      leftSupportKey: 'exteriorLeftSupport',
      calculationTypeKey: 'exteriorCalculationType',
      outputKey: 'tangentAimingExterior',
      logLabel: 'exterior',
      calculationFailedKey: TANGENT_AIMING_EXTERIOR_CALCULATION_FAILED_KEY,
      getDisplayedInputFields,
      invalidateResult: invalidateTangentAimingExteriorResult,
      toInputs: toTangentAimingExteriorInputs
    });
  }

  updateCalculationType(exteriorCalculationType: TangentAimingExteriorCalculationType): void {
    this.measureData.update((d) => invalidateTangentAimingExteriorResult({ ...d, exteriorCalculationType }));
  }
}
