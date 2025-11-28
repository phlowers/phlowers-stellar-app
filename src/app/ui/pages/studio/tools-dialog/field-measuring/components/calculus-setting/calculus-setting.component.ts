import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentAimingComponent } from './tangent-aiming/tangent-aiming.component';
import { PepComponent } from './pep/pep.component';
import { leftSupportOption } from '../../mock-data';

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
  selectedCalculusType: string = 'PAPOTO';
  leftSupportOption = leftSupportOption;
}
