import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { InputText } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-span',
  imports: [
    ReactiveFormsModule,
    InputText,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './span.component.html',
  styleUrl: './span.component.scss'
})
export class SpanComponent {
  form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      windPressure: [0, Validators.required],
      cableTemperature: [15, Validators.required],
      symmetryType: ['symmetric', Validators.required],
      iceThickness: [0],
      frontierSupportNumber: [null],
      iceThicknessBefore: [null],
      iceThicknessAfter: [null]
    });
  }
}
