import { ChangeDetectionStrategy, Component, inject, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@ui/shared/components/atoms/button/button.component';
import {
  FieldMeasure,
  ManualParameterCalculation15CWithoutWind
} from '@ui/pages/studio/toolbar-dialog/field-measuring/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { InitialConditionModalComponent } from '@ui/pages/study/tabs/sections/initialConditionModal/initialConditionModal.component';
import { InitialCondition } from '@core/domain';
import { StudiesService } from '@services/studies/studies.service';
import {
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@services/initial-conditions/initial-condition.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '@services/worker_python/tasks/types';
import { DecimalPipe } from '@angular/common';
import { isNumber } from 'lodash';
import { PlotService } from '@ui/pages/studio/services/plot.service';

/** Component for computing the cable parameter at 15°C without wind, supporting auto and manual modes. */
@Component({
  selector: 'app-parameter-at-15c-without-wind',
  imports: [
    FormsModule,
    SelectButtonModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent,
    InitialConditionModalComponent,
    DecimalPipe
  ],
  templateUrl: './parameter-calculation-15-without-wind.component.html',
  styleUrl: './parameter-calculation-15-without-wind.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ])
    ])
  ]
})
export class ParameterCalculation15WithoutWindComponent {
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();
  initialConditionModalOpen = signal<boolean>(false);

  initialConditionInput = signal<InitialCondition>({
    uuid: '',
    name: '',
    base_parameters: 2000,
    base_temperature: 15,
    cable_pretension: 0,
    min_temperature: 0,
    max_wind_pressure: 0,
    max_frost_width: 0
  });

  parameter15CError = signal<boolean>(false);

  readonly updateModeOptions = [
    { label: $localize`Auto`, value: 'auto' },
    { label: $localize`Manual`, value: 'manual' }
  ];

  private readonly workerPythonService = inject(WorkerPythonService);
  readonly plotService = inject(PlotService);
  readonly studiesService = inject(StudiesService);
  private readonly initialConditionService = inject(InitialConditionService);
  private readonly messageService = inject(MessageService);

  isFormValid = computed(() => {
    const isManual = this.measureData().updateMode15C === 'manual';
    if (isManual) {
      const manualData = this.measureData().manualParameterCalculation15CWithoutWind;
      return (
        isNumber(manualData?.cableTemperatureCalibration) &&
        isNumber(manualData?.parameterPapoto) &&
        isNumber(manualData?.cableTemperatureCalibrationUncertainty)
      );
    }
    return (
      isNumber(this.measureData().outputs.papoto?.parameter) &&
      // data.parameterUncertaintyPapoto !== null && // TODO: Uncomment when parameterUncertaintyPapoto is available
      isNumber(this.measureData().outputs.cableTemperature?.cableTemperature) &&
      isNumber(this.measureData().outputs.cableTemperature?.cableTemperatureUncertainty)
    );
  });

  updateMeasureData<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    if (field === 'updateMode15C') {
      this.measureData.update((d) => ({
        ...d,
        manualParameterCalculation15CWithoutWind: null,
        [field]: value
      }));
    } else {
      this.measureData.update((d) => ({ ...d, [field]: value }));
    }
  }

  updateManualParameterCalculation15CWithoutWind<K extends keyof ManualParameterCalculation15CWithoutWind>(
    field: K,
    value: ManualParameterCalculation15CWithoutWind[K]
  ) {
    this.measureData.update((d) => ({
      ...d,
      manualParameterCalculation15CWithoutWind: {
        ...(d.manualParameterCalculation15CWithoutWind as ManualParameterCalculation15CWithoutWind),
        [field]: value
      }
    }));
  }

  async calculateParameter15C() {
    this.parameter15CError.set(false);
    this.measureData.update((d) => ({
      ...d,
      outputs: { ...d.outputs, parameter15C: null }
    }));
    const data = this.measureData();
    if (!this.isFormValid()) {
      console.error('Missing required fields for parameter calculation');
      this.parameter15CError.set(true);
      return;
    }
    const isManual = data.updateMode15C === 'manual';
    const manualData = data.manualParameterCalculation15CWithoutWind;
    const manualDataToSend = {
      parameterPapoto: manualData?.parameterPapoto || null,
      parameterUncertaintyPapoto: manualData?.parameterUncertaintyPapoto || null,
      cableTemperatureCalibration: manualData?.cableTemperatureCalibration || null,
      cableTemperatureCalibrationUncertainty: manualData?.cableTemperatureCalibrationUncertainty || null
    };
    const autoDataToSend = {
      parameterPapoto: data.outputs.papoto?.parameter || null,
      // Uncertainties currently unused
      parameterUncertaintyPapoto: data.parameterUncertaintyPapoto || null,
      cableTemperatureCalibration: data.outputs.cableTemperature?.cableTemperature || null,
      cableTemperatureCalibrationUncertainty: data.outputs.cableTemperature?.cableTemperatureUncertainty || null
    };
    const dataToSend = isManual ? manualDataToSend : autoDataToSend;
    const { result, error } = await this.workerPythonService.runTask(Task.calculateParameter15CWithoutWind, {
      ...dataToSend,
      span_index: data.span?.[0] ?? null
    });
    if (error) {
      this.parameter15CError.set(true);
      return;
    }
    this.measureData.update((d) => ({
      ...d,
      outputs: { ...d.outputs, parameter15C: result }
    }));
  }

  onCreateInitialCondition(type: 'minus' | 'nominal' | 'plus') {
    // TODO: Implement create initial condition functionality
    const result = this.measureData().outputs.parameter15C;
    let baseParameter: number | undefined;

    if (type === 'minus') {
      baseParameter = result?.parameter15CMinusUncertainty;
    } else if (type === 'nominal') {
      baseParameter = result?.parameter15C;
    } else {
      baseParameter = result?.parameter15CPlusUncertainty;
    }

    if (!baseParameter) {
      return;
    }
    this.initialConditionInput.update((d) => ({
      ...d,
      base_parameters: baseParameter
    }));
    this.initialConditionModalOpen.set(true);
  }

  async addInitialCondition({ section, initialCondition, generateState = false }: InitialConditionFunctionsInput) {
    const newUuid = uuidv4();
    if (!this.plotService.study()) {
      return;
    }
    await this.initialConditionService.addInitialCondition(this.plotService.study()!, section, {
      ...initialCondition,
      uuid: newUuid
    });
    const studyUuid = this.plotService.study()?.uuid;
    if (!studyUuid) {
      return;
    }
    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) {
      return;
    }
    if (generateState) {
      await this.initialConditionService.setInitialCondition(study, section, newUuid);
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`Initial Condition added and state generated`,
        life: 3000
      });
    } else {
      this.messageService.add({
        severity: 'success',
        summary: $localize`Successful`,
        detail: $localize`Initial Condition added`,
        life: 3000
      });
    }
  }
}
