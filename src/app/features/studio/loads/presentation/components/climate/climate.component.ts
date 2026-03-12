import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '@features/studio/core/services/plot.service';
import { ChargesService } from '@core/services/charges/charges.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadFormsService } from '../../services/loadForms.service';
import { ChargeData, ClimateCharge, SymmetryType } from '@core/domain/models/charge.model';
import { MessageModule } from 'primeng/message';

/** Validator that rejects non-integer numeric values. */
function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined) {
    return null;
  }
  const value = control.value;
  if (!Number.isInteger(value)) {
    return { integer: true };
  }
  return null;
}

/** Default base temperature in degrees Celsius used for climatic charge calculations. */
export const DEFAULT_BASE_TEMPERATURE = 15;

/** Default climatic charge values used when creating a new charge case. */
export const defaultClimaticCharge: ClimateCharge = {
  windPressure: 0,
  cableTemperature: DEFAULT_BASE_TEMPERATURE,
  symmetryType: SymmetryType.SYMMETRIC,
  iceThickness: 0,
  frontierSupportNumber: null,
  iceThicknessBefore: null,
  iceThicknessAfter: null
};

/**
 * Returns the base climate values that match the base state calculation.
 * The base state uses the initial condition's base_temperature (or 15 if none),
 * with no wind pressure and no ice.
 */
export const getBaseClimate = (
  section: {
    initial_conditions: { uuid: string; base_temperature: number }[];
    selected_initial_condition_uuid?: string;
  } | null
): ClimateCharge => {
  const selectedInitialCondition = section?.initial_conditions?.find(
    (ic) => ic.uuid === section.selected_initial_condition_uuid
  );
  const baseTemperature = selectedInitialCondition?.base_temperature ?? DEFAULT_BASE_TEMPERATURE;

  return {
    ...defaultClimaticCharge,
    cableTemperature: baseTemperature
  };
};

/** Min/max constraints for climate form fields. */
export const climateConstraints = {
  windPressure: { min: -3000, max: 3000 },
  cableTemperature: { min: -50, max: 250 },
  iceThickness: { min: 0, max: 20 }
} as const;

@Component({
  selector: 'app-climate',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputGroupModule,
    InputGroupAddonModule,
    SelectModule,
    MessageModule,
    ButtonComponent,
    IconComponent
  ],
  templateUrl: './climate.component.html',
  styleUrl: './climate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for editing climatic charge parameters (wind pressure, temperature, ice) for a charge case. */
export class ClimateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly constraints = climateConstraints;

  form: FormGroup<{
    windPressure: FormControl<number | null>;
    cableTemperature: FormControl<number | null>;
    symmetryType: FormControl<SymmetryType | null>;
    iceThickness: FormControl<number | null>;
    frontierSupportNumber: FormControl<null>;
    iceThicknessBefore: FormControl<null>;
    iceThicknessAfter: FormControl<null>;
  }> = this.fb.group({
    windPressure: [
      defaultClimaticCharge.windPressure,
      [
        Validators.required,
        Validators.min(this.constraints.windPressure.min),
        Validators.max(this.constraints.windPressure.max),
        integerValidator
      ]
    ],
    cableTemperature: [
      defaultClimaticCharge.cableTemperature,
      [
        Validators.required,
        Validators.min(this.constraints.cableTemperature.min),
        Validators.max(this.constraints.cableTemperature.max),
        integerValidator
      ]
    ],
    symmetryType: [defaultClimaticCharge.symmetryType, Validators.required],
    iceThickness: [
      defaultClimaticCharge.iceThickness,
      [Validators.min(this.constraints.iceThickness.min), Validators.max(this.constraints.iceThickness.max)]
    ],
    frontierSupportNumber: [defaultClimaticCharge.frontierSupportNumber],
    iceThicknessBefore: [
      defaultClimaticCharge.iceThicknessBefore,
      [Validators.min(this.constraints.iceThickness.min), Validators.max(this.constraints.iceThickness.max)]
    ],
    iceThicknessAfter: [
      defaultClimaticCharge.iceThicknessAfter,
      [Validators.min(this.constraints.iceThickness.min), Validators.max(this.constraints.iceThickness.max)]
    ]
  });
  /** UUID of the charge case this climate form belongs to. */
  chargeUuid = input.required<string>();

  symmetryOptions = [
    { label: $localize`Symmetric`, value: SymmetryType.SYMMETRIC },
    { label: $localize`Dis Symmetric`, value: SymmetryType.DIS_SYMMETRIC }
  ];

  readonly frontierSupportOptions = signal<{ label: string; value: number }[]>([]);

  private readonly plotService = inject(PlotService);
  private readonly chargesService = inject(ChargesService);
  private readonly loadFormsService = inject(LoadFormsService);

  async initForm() {
    const supports = this.plotService.section()?.supports;
    const frontierSupportOptions =
      supports?.map((_, index) => ({
        label: (index + 1).toString(),
        value: index + 1
      })) ?? [];
    frontierSupportOptions.shift();
    frontierSupportOptions.pop();
    this.frontierSupportOptions.set(frontierSupportOptions);
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.plotService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      return;
    }
    const charge = await this.chargesService.getCharge(studyUuid, sectionUuid, this.chargeUuid());
    if (!charge?.data) {
      return;
    }
    const climate = charge.data.climate;
    this.form.patchValue(climate);
    this.form.updateValueAndValidity();
  }

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.plotService.temporaryLoadData = {
        ...this.plotService.temporaryLoadData!,
        climate: {
          ...this.plotService.temporaryLoadData?.climate,
          ...value
        } as ClimateCharge
      } as ChargeData;
    });
    effect(async () => {
      await this.initForm();
    });
  }

  resetForm() {
    const baseClimate = getBaseClimate(this.plotService.section());
    this.form.reset({ ...baseClimate });
    // Update temporaryLoadData with the base climate values
    this.plotService.temporaryLoadData = {
      ...this.plotService.temporaryLoadData!,
      climate: baseClimate
    } as ChargeData;
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

  getErrorIds(controlName: string, errorTypes: string[]): string | null {
    const control = this.form.get(controlName);
    if (!control?.errors) {
      return null;
    }
    const ids = errorTypes.filter((type) => control.errors?.[type]).map((type) => `${controlName}-error-${type}`);
    return ids.length > 0 ? ids.join(' ') : null;
  }
}
