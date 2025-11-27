import { Component, effect, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
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
import { ChargesService } from '@core/services/charges/charges.service';
import { ClimateCharge } from '@src/app/core/data/database/interfaces/charge';

export const defaultClimaticCharge: ClimateCharge = {
  windPressure: 0,
  cableTemperature: 15,
  symmetryType: 'symmetric',
  iceThickness: 0,
  frontierSupportNumber: null,
  iceThicknessBefore: null,
  iceThicknessAfter: null
};

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
  form: FormGroup<{
    windPressure: FormControl<number | null>;
    cableTemperature: FormControl<number | null>;
    symmetryType: FormControl<string | null>;
    iceThickness: FormControl<number | null>;
    frontierSupportNumber: FormControl<null>;
    iceThicknessBefore: FormControl<null>;
    iceThicknessAfter: FormControl<null>;
  }>;
  chargeUuid = input.required<string>();

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
    private readonly plotService: PlotService,
    private readonly chargesService: ChargesService
  ) {
    this.form = this.fb.group({
      windPressure: [defaultClimaticCharge.windPressure, Validators.required],
      cableTemperature: [
        defaultClimaticCharge.cableTemperature,
        Validators.required
      ],
      symmetryType: [defaultClimaticCharge.symmetryType, Validators.required],
      iceThickness: [defaultClimaticCharge.iceThickness],
      frontierSupportNumber: [defaultClimaticCharge.frontierSupportNumber],
      iceThicknessBefore: [defaultClimaticCharge.iceThicknessBefore],
      iceThicknessAfter: [defaultClimaticCharge.iceThicknessAfter]
    });
    effect(async () => {
      const studyUuid = this.plotService.study()?.uuid;
      const sectionUuid = this.plotService.section()?.uuid;
      if (!studyUuid || !sectionUuid) {
        return;
      }
      const charge = await this.chargesService.getCharge(
        studyUuid,
        sectionUuid,
        this.chargeUuid()
      );
      if (!charge?.data) {
        return;
      }
      const climate = charge.data.climate;
      this.form.patchValue(climate);
      this.form.updateValueAndValidity();
    });
  }

  resetForm() {
    this.form.reset({ ...defaultClimaticCharge });
  }

  deleteCharge() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }
    this.chargesService.deleteCharge(studyUuid, sectionUuid, this.chargeUuid());
  }

  getVisibleFormValues():
    | {
        windPressure: number;
        cableTemperature: number;
        symmetryType: string;
        iceThickness: number;
      }
    | {
        windPressure: number;
        cableTemperature: number;
        symmetryType: string;
        frontierSupportNumber: number | null;
        iceThicknessBefore: number | null;
        iceThicknessAfter: number | null;
      } {
    const value = this.form.value;
    const defaults = defaultClimaticCharge;
    const symmetryType = value.symmetryType ?? defaults.symmetryType;

    const baseValues = {
      windPressure: value.windPressure ?? defaults.windPressure,
      cableTemperature: value.cableTemperature ?? defaults.cableTemperature,
      symmetryType: symmetryType
    };

    if (symmetryType === 'symmetric') {
      return {
        ...baseValues,
        iceThickness: value.iceThickness ?? defaults.iceThickness
      };
    } else {
      return {
        ...baseValues,
        frontierSupportNumber:
          value.frontierSupportNumber ?? defaults.frontierSupportNumber,
        iceThicknessBefore:
          value.iceThicknessBefore ?? defaults.iceThicknessBefore,
        iceThicknessAfter: value.iceThicknessAfter ?? defaults.iceThicknessAfter
      };
    }
  }

  async submitForm() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }
    const visibleValues = this.getVisibleFormValues();
    const charge = await this.chargesService.getCharge(
      studyUuid,
      sectionUuid,
      this.chargeUuid()
    );
    if (!charge) {
      throw new Error('Charge not found');
    }
    // Merge visible values with existing climate data to preserve hidden fields
    // The spread order ensures visible values override existing ones, while preserving hidden fields
    const climate = {
      ...charge.data.climate,
      ...visibleValues
    } as ClimateCharge;
    this.chargesService.createOrUpdateCharge(studyUuid, sectionUuid, {
      ...charge,
      data: {
        ...charge.data,
        climate
      }
    });
  }

  calculForm() {
    const values = this.getVisibleFormValues();
    const defaults = defaultClimaticCharge;
    const iceThickness =
      'iceThickness' in values ? values.iceThickness : defaults.iceThickness;
    this.plotService.calculateCharge(
      values.windPressure || defaults.windPressure,
      values.cableTemperature || defaults.cableTemperature,
      iceThickness || defaults.iceThickness
    );
  }

  isFormEmpty(): boolean {
    return false;
  }
}
