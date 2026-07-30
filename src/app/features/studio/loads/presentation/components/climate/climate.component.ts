import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { SelectModule } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { ChargesService } from '@services/charges/charges.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoadFormsService } from '@features/studio/loads/presentation/services/loadForms.service';
import { ChargeData, ClimateCharge, SymmetryType } from '@shared/domain/models/charge.model';
import { defaultClimaticCharge, getBaseClimate } from '@shared/domain/helpers/climate.helpers';
import { integerValidator } from './climate.helpers';
import { climateConstraints } from './climate.constantes';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { MessageModule } from 'primeng/message';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

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
    IconComponent,
    TranslocoModule
  ],
  templateUrl: './climate.component.html',
  styleUrl: './climate.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Component for editing climatic charge parameters (wind pressure, temperature, ice) for a charge case. */
export class ClimateComponent {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translocoService = inject(TranslocoService);
  readonly constraints = climateConstraints;

  readonly isSaving = signal(false);
  readonly isCalculatingLoad = signal(false);

  form: FormGroup<{
    windPressure: FormControl<number | null>;
    cableTemperature: FormControl<number | null>;
    symmetryType: FormControl<SymmetryType | null>;
    iceThickness: FormControl<number | null>;
    frontierSupportNumber: FormControl<number | null>;
    iceThicknessBefore: FormControl<number | null>;
    iceThicknessAfter: FormControl<number | null>;
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
    { label: this.translocoService.translate('loads.climate.symmetric-option'), value: SymmetryType.SYMMETRIC },
    { label: this.translocoService.translate('loads.climate.dis-symmetric-option'), value: SymmetryType.DIS_SYMMETRIC }
  ];

  readonly frontierSupportOptions = signal<{ label: string; value: number }[]>([]);

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly chargesService = inject(ChargesService);
  private readonly loadFormsService = inject(LoadFormsService);

  async initForm() {
    const supports = this.spanService.section()?.supports;
    const frontierSupportOptions =
      supports?.map((support, index) => {
        const num = support.number;
        return {
          label: num ? formatSupportNumber(num) : String(index + 1),
          value: index + 1
        };
      }) ?? [];
    frontierSupportOptions.shift();
    frontierSupportOptions.pop();
    this.frontierSupportOptions.set(frontierSupportOptions);
    const defaultFrontierSupportNumber = frontierSupportOptions[0]?.value ?? null;
    this.form.patchValue({ frontierSupportNumber: defaultFrontierSupportNumber });
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      return;
    }
    const charge = await this.chargesService.getCharge(studyUuid, sectionUuid, this.chargeUuid());
    if (!charge?.data) {
      return;
    }
    const climate = charge.data.climate;
    this.form.patchValue({
      ...climate,
      frontierSupportNumber: climate.frontierSupportNumber ?? defaultFrontierSupportNumber
    });
    this.form.updateValueAndValidity();
  }

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const temporaryLoadData = this.plotService.temporaryLoadData;
      if (!temporaryLoadData) {
        return;
      }
      this.plotService.temporaryLoadData = {
        ...temporaryLoadData,
        climate: {
          ...temporaryLoadData.climate,
          ...value
        } as ClimateCharge
      } as ChargeData;
    });
    effect((onCleanup) => {
      const currentChargeUuid = this.chargeUuid(); // Capture current value
      let isCancelled = false;

      onCleanup(() => {
        isCancelled = true; // Mark as cancelled if effect reruns
      });

      // Wrap the async call
      (async () => {
        await this.initForm();

        // Before patching, verify we haven't been superseded
        if (!isCancelled && this.chargeUuid() === currentChargeUuid) {
          // Safe to update form
        }
      })();
    });
  }

  resetForm() {
    const baseClimate = getBaseClimate(this.spanService.section());
    baseClimate.frontierSupportNumber = this.frontierSupportOptions()[0]?.value ?? null;
    this.form.reset({ ...baseClimate });
    // Update temporaryLoadData with the base climate values
    this.plotService.temporaryLoadData = {
      ...this.plotService.temporaryLoadData!,
      climate: baseClimate
    } as ChargeData;
  }

  async deleteCharge(): Promise<void> {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      throw new Error('Study or section not found');
    }
    await this.loadFormsService.deleteLoad();
    await this.chargesService.deleteCharge(studyUuid, sectionUuid, this.chargeUuid());
  }

  async saveForm() {
    const studyUuid = this.plotService.study()?.uuid;
    const sectionUuid = this.spanService.section()?.uuid;
    if (!studyUuid || !sectionUuid) {
      return;
    }
    this.isSaving.set(true);
    try {
      await this.loadFormsService.saveTemporaryLoadDataInSection();
    } finally {
      this.isSaving.set(false);
    }
  }

  async calculateForm() {
    this.isCalculatingLoad.set(true);
    try {
      await this.loadFormsService.calculateLoad();
    } finally {
      this.isCalculatingLoad.set(false);
    }
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
