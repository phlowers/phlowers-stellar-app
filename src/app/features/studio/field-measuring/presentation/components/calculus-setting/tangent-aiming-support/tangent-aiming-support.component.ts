import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageModule } from 'primeng/message';
import { TranslocoModule } from '@jsverse/transloco';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TangentAimingFormBase } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-form.base';
import { TangentAimingHeaderComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-header/tangent-aiming-header.component';
import { TangentAimingNumberFieldComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-number-field/tangent-aiming-number-field.component';
import { TangentAimingResultsComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-results/tangent-aiming-results.component';
import {
  TANGENT_AIMING_SUPPORT_CALCULATION_FAILED_KEY,
  TANGENT_AIMING_SUPPORT_FIELD_RULES,
  TANGENT_AIMING_SUPPORT_MODEL_FIELDS,
  TANGENT_AIMING_SUPPORT_NUMBER_FIELDS
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-support/tangent-aiming-support.constantes';
import {
  createTangentAimingSupportForm,
  getDisplayedInputFields,
  invalidateTangentAimingSupportResult,
  toTangentAimingSupportInputs
} from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-support/tangent-aiming-support.helpers';
import { TangentAimingSupportForm } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-support/tangent-aiming-support.interfaces';

/** Form for the tangent aiming (support) parameter calculation. */
@Component({
  selector: 'app-tangent-aiming-support',
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
  templateUrl: './tangent-aiming-support.component.html',
  styleUrl: './tangent-aiming-support.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TangentAimingSupportComponent extends TangentAimingFormBase {
  readonly mandatoryId = 'mandatory-tangent-aiming-support';
  readonly fields = TANGENT_AIMING_SUPPORT_NUMBER_FIELDS;
  readonly rules = TANGENT_AIMING_SUPPORT_FIELD_RULES;
  readonly form = this.config.form as TangentAimingSupportForm;

  readonly showParameterField = computed(() => this.measureData().calculationType === 'parametre');
  readonly showTangentAngleField = computed(() => this.measureData().calculationType === 'tangente');

  constructor() {
    super({
      form: createTangentAimingSupportForm(),
      modelFields: TANGENT_AIMING_SUPPORT_MODEL_FIELDS,
      leftSupportKey: 'tangentLeftSupport',
      calculationTypeKey: 'calculationType',
      outputKey: 'tangentAimingSupport',
      logLabel: 'support',
      calculationFailedKey: TANGENT_AIMING_SUPPORT_CALCULATION_FAILED_KEY,
      getDisplayedInputFields,
      invalidateResult: invalidateTangentAimingSupportResult,
      toInputs: toTangentAimingSupportInputs
    });
  }

  updateCalculationType(calculationType: FieldMeasure['calculationType']): void {
    this.measureData.update((d) => invalidateTangentAimingSupportResult({ ...d, calculationType }));
  }
}
