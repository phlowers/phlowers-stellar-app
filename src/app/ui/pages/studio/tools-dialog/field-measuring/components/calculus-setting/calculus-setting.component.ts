import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButton } from 'primeng/radiobutton';
import { PapotoComponent } from './papoto/papoto.component';
import { TangentBearingsComponent } from './tangent-bearings/tangent-bearings.component';
import { PepComponent } from './pep/pep.component';
import { leftSupportOption } from '../../mock-data';

@Component({
  selector: 'app-calculus-setting',
  imports: [FormsModule, RadioButton, PapotoComponent, PepComponent, TangentBearingsComponent],
  templateUrl: './calculus-setting.component.html',
  styleUrl: './calculus-setting.component.scss'
})
export class CalculusSettingComponent {
  selectedCalculusType: string = 'PAPOTO';
  leftSupportOption = leftSupportOption;
}
