import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';

@Component({
  selector: 'app-climate',
  imports: [
    ReactiveFormsModule,
    InputNumberModule,
    SelectModule,
    ButtonComponent
  ],
  templateUrl: './climate.component.html',
  styleUrl: './climate.component.scss'
})
export class ClimateComponent {
  form: FormGroup;

  symmetryOptions = [
    { label: 'Symmetric', value: 'symmetric' },
    { label: 'Dis Symmetric', value: 'dis_symmetric' }
  ];

  frontierSupportOptions = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 }
  ];

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      windPressure: [0, Validators.required],
      cableTemperature: [15, Validators.required],
      symmetryType: ['symmetric', Validators.required],
      iceThickness: [0], // for symmetric
      frontierSupportNumber: [null], // for dis symmetric
      iceThicknessBefore: [null],
      iceThicknessAfter: [null]
    });
  }

  resetForm() {
    this.form.reset({
      windPressure: 0,
      cableTemperature: 15,
      symmetryType: 'symmetric',
      iceThickness: 0,
      frontierSupportNumber: null,
      iceThicknessBefore: null,
      iceThicknessAfter: null
    });
  }

  submitForm() {
    console.log('Submit (save):', this.form.value);
  }

  calculForm() {
    console.log('Calculus values:');
    Object.entries(this.form.value).forEach(([key, val]) =>
      console.log(`${key}: ${val}`)
    );
  }

  isFormEmpty(): boolean {
    const values = this.form.value;
    return Object.values(values).every(
      (val) => val === null || val === undefined || val === ''
    );
  }
}
