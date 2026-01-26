import { Component, model, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingComponent } from './tangent-aiming/tangent-aiming.component';
import { PepComponent } from './pep/pep.component';
import { FieldMeasure } from '../../types';

@Component({
  selector: 'app-calculus-setting',
  imports: [
    FormsModule,
    RadioButton,
    PapotoComponent,
    PepComponent,
    TangentAimingComponent
  ],
  templateUrl: './calculus-setting.component.html',
  styleUrl: './calculus-setting.component.scss'
})
export class CalculusSettingComponent {
  measureData = model.required<FieldMeasure>();
  selectedCalculusType = 'PAPOTO';
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
