import { ChangeDetectionStrategy, Component, model, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingComponent } from './tangent-aiming/tangent-aiming.component';
import { PepComponent } from './pep/pep.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';

@Component({
  selector: 'app-calculus-setting',
  imports: [FormsModule, RadioButton, PapotoComponent, PepComponent, TangentAimingComponent],
  templateUrl: './calculus-setting.component.html',
  styleUrl: './calculus-setting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component allowing the user to select and configure a field measurement calculation method (PAPOTO, PEP, or tangent aiming). */
export class CalculusSettingComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();
  readonly selectedCalculusType = signal('PAPOTO');
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
