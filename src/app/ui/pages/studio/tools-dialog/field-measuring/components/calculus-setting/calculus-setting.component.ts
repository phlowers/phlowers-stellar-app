import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingComponent } from './tangent-aiming/tangent-aiming.component';
import { PepComponent } from './pep/pep.component';
import { leftSupportOption } from '../../mock-data';
import { FieldMeasureData } from '../../types';

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
  measureData = model.required<FieldMeasureData>();
  selectedCalculusType: string = 'PAPOTO';
  leftSupportOption = leftSupportOption;
}
