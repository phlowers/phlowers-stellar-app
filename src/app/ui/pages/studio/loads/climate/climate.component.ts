import { Component, DestroyRef, effect, inject, input } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '../../services/plot.service';
import { ChargesService } from '@core/services/charges/charges.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadFormsService } from '../loadForms.service';
import { ClimateCharge } from '@src/app/core';
import { ChargeData } from '@src/app/core/domain/models/charge.model';

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
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  form: FormGroup<{
    windPressure: FormControl<number | null>;
    cableTemperature: FormControl<number | null>;
    symmetryType: FormControl<string | null>;
    iceThickness: FormControl<number | null>;
    frontierSupportNumber: FormControl<null>;
    iceThicknessBefore: FormControl<null>;
    iceThicknessAfter: FormControl<null>;
  }> = this.fb.group({
    windPressure: [
      defaultClimaticCharge.windPressure,
      [Validators.required, Validators.min(-1600), Validators.max(1600)]
    ],
    cableTemperature: [
      defaultClimaticCharge.cableTemperature,
      [Validators.required, Validators.min(-50), Validators.max(1000)]
    ],
    symmetryType: [defaultClimaticCharge.symmetryType, Validators.required],
    iceThickness: [defaultClimaticCharge.iceThickness],
    frontierSupportNumber: [defaultClimaticCharge.frontierSupportNumber],
    iceThicknessBefore: [defaultClimaticCharge.iceThicknessBefore],
    iceThicknessAfter: [defaultClimaticCharge.iceThicknessAfter]
  });
  chargeUuid = input.required<string>();

  symmetryOptions = [
    { label: $localize`Symmetric`, value: 'symmetric' },
    { label: $localize`Dis Symmetric`, value: 'dis_symmetric' }
  ];

  frontierSupportOptions: { label: string; value: number }[] = [];

  async initForm() {
    const supports = this.plotService.section()?.supports;
    const frontierSupportOptions =
      supports?.map((_, index) => ({
        label: (index + 1).toString(),
        value: index
      })) ?? [];
    frontierSupportOptions.shift();
    frontierSupportOptions.pop();
    this.frontierSupportOptions = frontierSupportOptions;
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
  }

  constructor(
    private readonly plotService: PlotService,
    private readonly chargesService: ChargesService,
    private readonly loadFormsService: LoadFormsService
  ) {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.plotService.temporaryLoadData = {
          ...this.plotService.temporaryLoadData!,
          climate: {
            ...(this.plotService.temporaryLoadData?.climate ?? {}),
            ...value
          } as ClimateCharge
        } as ChargeData;
      });
    effect(async () => {
      await this.initForm();
    });
  }

  resetForm() {
    this.form.reset({ ...defaultClimaticCharge });
    this.loadFormsService.initTemporaryLoadData();
  }

  deleteCharge() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }
    this.chargesService.deleteCharge(studyUuid, sectionUuid, this.chargeUuid());
  }

  async saveForm() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }
    this.loadFormsService.saveTemporaryLoadDataInSection();
  }

  async calculateForm() {
    await this.loadFormsService.calculateLoad();
  }

  isFormValid(): boolean {
    return this.form.valid;
  }
}
