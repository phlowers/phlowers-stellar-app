import { Component, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { FieldMeasureData } from '@src/app/ui/pages/studio/tools-dialog/field-measuring/types';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { InitialConditionModalComponent } from '@src/app/ui/pages/study/tabs/sections/initialConditionModal/initialConditionModal.component';
import { InitialCondition } from '@src/app/core/data/database/interfaces/initialCondition';
import { SectionService } from '@src/app/core/services/sections/section.service';
import { StudiesService } from '@src/app/core/services/studies/studies.service';
import {
  InitialConditionFunctionsInput,
  InitialConditionService
} from '@src/app/core/services/initial-conditions/initial-condition.service';
import { MessageService } from 'primeng/api';
import { v4 as uuidv4 } from 'uuid';

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
    InitialConditionModalComponent
  ],
  templateUrl: './parameter-calculation-15-without-wind.component.html',
  styleUrl: './parameter-calculation-15-without-wind.component.scss',
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class ParameterCalculation15WithoutWindComponent {
  measureData = model.required<FieldMeasureData>();
  parameter15CResult = signal<{
    parameter15CMinusUncertainty: number;
    parameter15C: number;
    parameter15CPlusUncertainty: number;
  } | null>(null);

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

  constructor(
    private readonly workerPythonService: WorkerPythonService,
    public readonly sectionService: SectionService,
    public readonly studiesService: StudiesService,
    private readonly initialConditionService: InitialConditionService,
    private readonly messageService: MessageService
  ) {}

  isFormValid = computed(() => {
    const data = this.measureData();
    if (data.updateMode15C === 'manual') {
      return (
        data.parameterPapoto !== null &&
        data.parameterUncertaintyPapoto !== null &&
        data.cableTemperature15C !== null &&
        data.cableTemperatureUncertainty15C !== null
      );
    }
    // For auto mode, validation might depend on other fields
    return true;
  });

  updateField<K extends keyof FieldMeasureData>(
    field: K,
    value: FieldMeasureData[K]
  ) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  async calculateParameter15C() {
    // const data = this.measureData();
    // TODO: Implement actual parameter at 15°C calculation when Task is available
    // For now, this is a placeholder
    // const { result, error } = await this.workerPythonService.runTask(
    //   Task.calculateParameter15C,
    //   {
    //     parameterPapoto: data.parameterPapoto,
    //     parameterUncertaintyPapoto: data.parameterUncertaintyPapoto,
    //     cableTemperature15C: data.cableTemperature15C,
    //     cableTemperatureUncertainty15C: data.cableTemperatureUncertainty15C,
    //     updateMode15C: data.updateMode15C
    //   }
    // );
    // if (error) {
    //   this.parameter15CError.set(true);
    //   return;
    // }
    // this.parameter15CResult.set(result);

    // Placeholder result for UI testing
    this.parameter15CResult.set({
      parameter15CMinusUncertainty: 1885,
      parameter15C: 1900,
      parameter15CPlusUncertainty: 1915
    });
  }

  onCreateInitialCondition(type: 'minus' | 'nominal' | 'plus') {
    // TODO: Implement create initial condition functionality
    console.log('Create initial condition:', type);
    const baseParameter =
      type === 'minus'
        ? this.parameter15CResult()?.parameter15CMinusUncertainty
        : type === 'nominal'
          ? this.parameter15CResult()?.parameter15C
          : this.parameter15CResult()?.parameter15CPlusUncertainty;
    if (!baseParameter) {
      return;
    }
    this.initialConditionInput.update((d) => ({
      ...d,
      base_parameters: baseParameter
    }));
    this.initialConditionModalOpen.set(true);
  }

  async addInitialCondition({
    section,
    initialCondition,
    generateState = false
  }: InitialConditionFunctionsInput) {
    const newUuid = uuidv4();
    if (!this.studiesService.currentStudy()) {
      return;
    }
    await this.initialConditionService.addInitialCondition(
      this.studiesService.currentStudy()!,
      section,
      { ...initialCondition, uuid: newUuid }
    );
    const studyUuid = this.studiesService.currentStudy()?.uuid;
    if (!studyUuid) {
      return;
    }
    const study = await this.studiesService.getStudy(studyUuid);
    if (!study) {
      return;
    }
    if (generateState) {
      await this.initialConditionService.setInitialCondition(
        study,
        section,
        newUuid
      );
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
