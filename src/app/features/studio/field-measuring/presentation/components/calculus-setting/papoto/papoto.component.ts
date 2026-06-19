import { ChangeDetectionStrategy, Component, input, model, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { DialogModule } from 'primeng/dialog';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { FieldMeasure } from '@features/studio/field-measuring/domain/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { CommonModule } from '@angular/common';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { formatSupportNumber } from '@shared/helpers/formatSupportNumber';
import { truncateNumberToOneDecimal } from '@shared/helpers/truncateDecimals';

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
/** Component for PAPOTO parameter calculation from field measurement angles and distances. */
export class PapotoComponent {
  /** Available support options for the left support selector. */
  leftSupportOption = input.required<{ label: string; value: string }[]>();
  /** Field measure data model bound two-way. */
  measureData = model.required<FieldMeasure>();

  private readonly plotService = inject(PlotService);
  private readonly spanService = inject(PlotSpanService);
  private readonly workerPythonService = inject(WorkerPythonService);

  // Compute the dynamic left support options based on selectedSpan
  retrievedLeftSupportOptions = computed(() => {
    const span = this.measureData().span;
    if (span?.length !== 2) {
      return [];
    }

    const [leftIndex, rightIndex] = span;
    const supports = this.spanService.section()?.supports ?? [];
    const leftNum = supports[leftIndex]?.number;
    const rightNum = supports[rightIndex]?.number;
    const leftLabel = leftNum ? formatSupportNumber(leftNum) : String(leftIndex + 1);
    const rightLabel = rightNum ? formatSupportNumber(rightNum) : String(rightIndex + 1);
    return [
      { label: leftLabel, value: leftLabel },
      { label: rightLabel, value: rightLabel }
    ];
  });

  // Helper function to get calculated value from litData
  private getCalculatedValue(field: 'span_length' | 'elevation'): number | null {
    const span = this.measureData().span;
    const litData = this.plotService.litData();

    if (span?.length !== 2 || !litData?.output_parameters[field]) {
      return null;
    }

    const [leftIndex] = span;
    const value = litData.output_parameters[field][leftIndex];

    return value ?? null;
  }

  // Computed property for calculated span length
  calculatedSpanLength = computed(() => this.getCalculatedValue('span_length'));

  // Computed property for calculated elevation difference
  calculatedElevation = computed(() => this.getCalculatedValue('elevation'));

  papotoHelpDialog = signal<boolean>(false);

  papotoError = signal<boolean>(false);
  readonly isCalculating = signal(false);

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

  updateField<K extends keyof FieldMeasure>(field: K, value: FieldMeasure[K]) {
    this.measureData.update((d) => ({ ...d, [field]: value }));
  }

  truncate1Decimal(value: number | undefined | null): number | null {
    if (value == null) return null;
    return truncateNumberToOneDecimal(value);
  }

  openHelp() {
    this.papotoHelpDialog.set(true);
  }

  async calculatePapoto() {
    const data = this.measureData();
    this.papotoError.set(false);
    this.measureData.update((d) => ({
      ...d,
      outputs: { ...d.outputs, papoto: null }
    }));
    this.isCalculating.set(true);
    try {
      const { result, error } = await this.workerPythonService.runTask(Task.calculatePapoto, {
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
      });
      if (error) {
        this.papotoError.set(true);
      }
      this.measureData.update((d) => ({
        ...d,
        outputs: { ...d.outputs, papoto: result }
      }));
    } finally {
      this.isCalculating.set(false);
    }
  }
}
