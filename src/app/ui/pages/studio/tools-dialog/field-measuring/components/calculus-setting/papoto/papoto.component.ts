import { Component, input, model, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@src/app/ui/shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@src/app/ui/shared/components/atoms/button/button.component';
import { FieldMeasureData } from '../../../types';
import { WorkerPythonService } from '@src/app/core/services/worker_python/worker-python.service';
import { Task } from '@src/app/core/services/worker_python/tasks/types';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-papoto',
  imports: [
    FormsModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    IconComponent,
    ButtonComponent,
    DialogModule,
    CommonModule
  ],
  templateUrl: './papoto.component.html',
  styleUrl: './papoto.component.scss',
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
export class PapotoComponent {
  leftSupportOption = input.required<{ label: string; value: string }[]>();
  measureData = model.required<FieldMeasureData>();

  papotoHelpDialog = signal<boolean>(false);

  papotoResult = signal<{
    parameter: number;
    parameter_1_2: number;
    parameter_2_3: number;
    parameter_1_3: number;
    check_validity: boolean;
  } | null>(null);

  papotoError = signal<boolean>(false);

  constructor(private readonly workerPythonService: WorkerPythonService) {}

  isFormValid = computed(() => {
    const data = this.measureData();
    return !!(
      data.leftSupport &&
      data.spanLength != null &&
      data.measuredElevationDifference != null &&
      data.HL != null &&
      data.H1 != null &&
      data.H2 != null &&
      data.H3 != null &&
      data.HR != null &&
      data.VL != null &&
      data.V1 != null &&
      data.V2 != null &&
      data.V3 != null &&
      data.VR != null
    );
  });

  updateField<K extends keyof FieldMeasureData>(
    field: K,
    value: FieldMeasureData[K]
  ) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  openHelp() {
    this.papotoHelpDialog.set(true);
  }

  async calculatePapoto() {
    const data = this.measureData();
    const { result, error } = await this.workerPythonService.runTask(
      Task.calculatePapoto,
      {
        spanLength: data.spanLength || 0,
        measuredElevationDifference: data.measuredElevationDifference || 0,
        HL: data.HL || 0,
        H1: data.H1 || 0,
        H2: data.H2 || 0,
        H3: data.H3 || 0,
        HR: data.HR || 0,
        VL: data.VL || 0,
        V1: data.V1 || 0,
        V2: data.V2 || 0,
        V3: data.V3 || 0,
        VR: data.VR || 0
      }
    );
    if (error) {
      this.papotoError.set(true);
    }

    this.papotoResult.set(result);
  }
}
