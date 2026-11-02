import { ChangeDetectionStrategy, Component, model, computed, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingSupportComponent } from './tangent-aiming-support/tangent-aiming-support.component';
import { TangentAimingExteriorComponent } from './tangent-aiming-exterior/tangent-aiming-exterior.component';
import { TangentAimingInteriorComponent } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.component';
import { PepComponent } from './pep/pep.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TranslocoModule } from '@jsverse/transloco';
import { applyTangentAimingSupportDefaults } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-support/tangent-aiming-support.helpers';
import { getDefaultLeftSupport } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-common/tangent-aiming-common.helpers';
import { applyTangentAimingExteriorDefaults } from './tangent-aiming-exterior/tangent-aiming-exterior.helpers';
import { applyTangentAimingInteriorDefaults } from '@features/studio/field-measuring/presentation/components/calculus-setting/tangent-aiming-interior/tangent-aiming-interior.helpers';
import { clearAutoParameter15C } from '@features/studio/field-measuring/presentation/helpers';
import { CALCULUS_TYPE_BY_METHOD } from './calculus-setting.constantes';

@Component({
  selector: 'app-calculus-setting',
  imports: [
    FormsModule,
    RadioButton,
    PapotoComponent,
    PepComponent,
    TangentAimingSupportComponent,
    TangentAimingExteriorComponent,
    TangentAimingInteriorComponent,
    TranslocoModule
  ],
  templateUrl: './calculus-setting.component.html',
  styleUrl: './calculus-setting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component allowing the user to select and configure a field measurement calculation method (PAPOTO, PEP, or tangent aiming). */
export class CalculusSettingComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();
  /** Memoized so that editing other fields of the measure does not reset the selected calculus type. */
  private readonly calculationMethod = computed(() => this.measureData().calculationMethod);
  readonly selectedCalculusType = linkedSignal({
    source: this.calculationMethod,
    computation: (method) => CALCULUS_TYPE_BY_METHOD[method] ?? 'PAPOTO'
  });

  /** Selects a method and persists it in the measure (PEP is not selectable yet); the auto 15°C result of the previous method is stale. */
  onCalculusTypeChange(type: string): void {
    this.selectedCalculusType.set(type);
    if (type === 'PAPOTO') {
      this.measureData.update((d) => clearAutoParameter15C({ ...d, calculationMethod: 'papoto' }));
    } else if (type === 'TANGENT_AIMING_SUPPORT') {
      this.measureData.update((d) =>
        clearAutoParameter15C({
          ...applyTangentAimingSupportDefaults(d, getDefaultLeftSupport(d.span)),
          calculationMethod: 'tangente-aiming'
        })
      );
    } else if (type === 'TANGENT_AIMING_EXTERIOR') {
      this.measureData.update((d) =>
        clearAutoParameter15C({
          ...applyTangentAimingExteriorDefaults(d, getDefaultLeftSupport(d.span)),
          calculationMethod: 'tangente-aiming-exterior'
        })
      );
    } else if (type === 'TANGENT_AIMING_INTERIOR') {
      this.measureData.update((d) =>
        clearAutoParameter15C({
          ...applyTangentAimingInteriorDefaults(d, getDefaultLeftSupport(d.span)),
          calculationMethod: 'tangente-aiming-interior'
        })
      );
    }
  }
  leftSupportOption = computed(() => {
    const span = this.measureData().span;
    if (!span) {
      return [];
    }
    return span.map((s) => ({
      label: (s + 1).toString(),
      value: s.toString()
    }));
  });
}
