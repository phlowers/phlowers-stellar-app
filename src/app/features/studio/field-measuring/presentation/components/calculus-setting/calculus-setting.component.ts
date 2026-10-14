import { ChangeDetectionStrategy, Component, model, computed, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingSupportComponent } from './tangent-aiming-support/tangent-aiming-support.component';
import { PepComponent } from './pep/pep.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { TranslocoModule } from '@jsverse/transloco';
import {
  applyTangentAimingSupportDefaults,
  getDefaultLeftSupport
} from './tangent-aiming-support/tangent-aiming-support.helpers';

const CALCULUS_TYPE_BY_METHOD: Record<FieldMeasure['calculationMethod'], string> = {
  papoto: 'PAPOTO',
  'tangente-aiming': 'TANGENT_AIMING_SUPPORT',
  pep: 'PEP'
};

@Component({
  selector: 'app-calculus-setting',
  imports: [FormsModule, RadioButton, PapotoComponent, PepComponent, TangentAimingSupportComponent, TranslocoModule],
  templateUrl: './calculus-setting.component.html',
  styleUrl: './calculus-setting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component allowing the user to select and configure a field measurement calculation method (PAPOTO, PEP, or tangent aiming). */
export class CalculusSettingComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();
  readonly selectedCalculusType = linkedSignal(
    () => CALCULUS_TYPE_BY_METHOD[this.measureData().calculationMethod] ?? 'PAPOTO'
  );

  /** Selects a method and persists it in the measure (PEP is not selectable yet). */
  onCalculusTypeChange(type: string): void {
    this.selectedCalculusType.set(type);
    if (type === 'PAPOTO') {
      this.measureData.update((d) => ({ ...d, calculationMethod: 'papoto' }));
    } else if (type === 'TANGENT_AIMING_SUPPORT') {
      this.measureData.update((d) => ({
        ...applyTangentAimingSupportDefaults(d, getDefaultLeftSupport(d.span)),
        calculationMethod: 'tangente-aiming'
      }));
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
