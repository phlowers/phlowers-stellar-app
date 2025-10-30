import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { PlotService } from '../../plot.service';

@Component({
  selector: 'app-climate',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './climate.component.html',
  styleUrl: './climate.component.scss'
})
export class ClimateComponent {
  form: FormGroup;

  symmetryOptions = [
    { label: $localize`Symmetric`, value: 'symmetric' },
    { label: $localize`Dis Symmetric`, value: 'dis_symmetric' }
  ];

  frontierSupportOptions = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly workerPythonService: WorkerPythonService,
    private readonly plotService: PlotService
  ) {
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

  eraseForm() {
    console.log('erase the load case!');
  }

  getVisibleFormValues(): {
    windPressure: number;
    cableTemperature: number;
    symmetryType: string;
    iceThickness?: number;
    frontierSupportNumber?: number;
    iceThicknessBefore?: number;
    iceThicknessAfter?: number;
  } {
    const symmetryType = this.form.value.symmetryType;

    if (symmetryType === 'symmetric') {
      return {
        windPressure: this.form.value.windPressure,
        cableTemperature: this.form.value.cableTemperature,
        symmetryType,
        iceThickness: this.form.value.iceThickness
      };
    } else if (symmetryType === 'dis_symmetric') {
      return {
        windPressure: this.form.value.windPressure,
        cableTemperature: this.form.value.cableTemperature,
        symmetryType,
        frontierSupportNumber: this.form.value.frontierSupportNumber,
        iceThicknessBefore: this.form.value.iceThicknessBefore,
        iceThicknessAfter: this.form.value.iceThicknessAfter
      };
    }

    // Fallback, should not happen
    return this.form.value;
  }

  submitForm() {
    console.log('Submit (save):', this.getVisibleFormValues());
  }

  calculForm() {
    this.plotService.calculateCharge(
      this.getVisibleFormValues().windPressure,
      this.getVisibleFormValues().cableTemperature
    );
  }

  isFormEmpty(): boolean {
    return false;
  }
}
