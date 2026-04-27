import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  viewChild,
  computed,
  effect,
  inject,
  signal,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { CardComponent } from '@shared/components/atoms/card/card.component';
import { Task } from '@services/worker_python/tasks/types';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { VtlAndGuying } from '@shared/domain';
import { SectionService } from '@services/section/section.service';
import { MessageService } from 'primeng/api';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LoggerService } from '@core/services/logger/logger.service';

/** Option for selecting a reference support direction. */
interface SupportOption {
  /** Support number label. */
  label: string;
  /** Left or right side of the span. */
  value: 'LEFT' | 'RIGHT';
}

@Component({
  selector: 'app-vtl-and-guying-tool',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    SelectModule,
    InputNumberModule,
    CheckboxModule,
    TextareaModule,
    ProgressSpinnerModule,
    ButtonComponent,
    IconComponent,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    CardComponent
  ],
  templateUrl: './vtl-and-guying.component.html',
  styleUrls: ['./vtl-and-guying.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
/** Dialog component for computing VTL (Vertical/Transverse/Longitudinal) forces and guying parameters. */
export class VhlAndGuyingComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly sectionService = inject(SectionService);
  private readonly messageService = inject(MessageService);
  public readonly plotService = inject(PlotService);
  readonly spanService = inject(PlotSpanService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly fb = inject(FormBuilder);
  private readonly logger = inject(LoggerService);

  form: FormGroup<{
    selectedSpan: FormControl<VtlAndGuying['inputs']['selectedSpan']>;
    selectedSupport: FormControl<VtlAndGuying['inputs']['selectedSupport']>;
    altitude: FormControl<VtlAndGuying['inputs']['altitude']>;
    horizontalDistance: FormControl<VtlAndGuying['inputs']['horizontalDistance']>;
    hasPulley: FormControl<VtlAndGuying['inputs']['hasPulley']>;
    comment: FormControl<VtlAndGuying['comment']>;
  }>;

  readonly supportType = signal<'Suspension' | 'Anchor' | null>(null);
  readonly supportOptions = signal<SupportOption[]>([]);
  readonly vtlWithoutGuying = signal<{
    chargeV: number | undefined;
    chargeH: number | undefined;
    chargeL: number | undefined;
    resultant: number | undefined;
  } | null>(null);

  results = signal<{
    tensionInGuy: number | null;
    guyAngle: number | null;
    chargeVUnderConsole: number | null;
    chargeHUnderConsole: number | null;
    chargeLIfPulley: number | null;
  } | null>(null);

  readonly loading = computed(() => this.plotService.loading() || !this.plotService.litData());
  readonly isCalculating = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.form = this.fb.group({
      selectedSpan: this.fb.control<{ index: number; uuid: string } | null>(null),
      selectedSupport: this.fb.control<'LEFT' | 'RIGHT' | null>(
        {
          value: null,
          disabled: true
        },
        [Validators.required]
      ),
      altitude: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      horizontalDistance: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
      hasPulley: this.fb.control<boolean>(false, { nonNullable: true }),
      comment: this.fb.control<string>('', { nonNullable: true })
    });

    // Update computed values when form values change
    this.form.controls.selectedSpan.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.form.controls.selectedSupport.setValue(null, { emitEvent: false });
      const selectedSpan = this.form.controls.selectedSpan.value;

      // Enable/disable selectedSupport based on selectedSpan value
      if (selectedSpan === null) {
        this.form.controls.selectedSupport.disable({ emitEvent: false });
      } else {
        this.form.controls.selectedSupport.enable({ emitEvent: false });
      }

      this.supportOptions.set(this.spanService.getSupportOptions(selectedSpan?.uuid ?? null));
      this.supportType.set(null);
      this.vtlWithoutGuying.set(null);
      this.results.set(null);
    });

    this.form.controls.selectedSupport.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.updateSupportType();
      this.updateVtlWithoutGuying();
      this.results.set(null);
    });

    // Also update when plotService data changes
    effect(() => {
      this.plotService.litData();
      this.updateVtlWithoutGuying();
    });

    this.form.controls.altitude.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.results.set(null);
    });

    this.form.controls.horizontalDistance.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.results.set(null);
    });

    // Initialize computed values
    this.updateSupportOptions();

    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
        this.setFormValuesFromSection();
      }
    });
  }

  private updateSupportOptions(): void {
    const selectedSpan = this.form.controls.selectedSpan.value;
    this.supportOptions.set(this.spanService.getSupportOptions(selectedSpan?.uuid ?? null));
  }

  private updateSupportType(): void {
    const support = this.form.controls.selectedSupport.value;
    const span = this.form.controls.selectedSpan.value;
    const spanIndex = span?.index ?? 0;
    const supportIndex = support === 'LEFT' ? spanIndex : spanIndex + 1;
    if (support === null) {
      this.supportType.set(null);
      return;
    }
    const supportType =
      this.spanService.section()?.supports[supportIndex].chainV === true ? $localize`Suspension` : $localize`Anchor`;
    this.supportType.set(supportType as 'Suspension' | 'Anchor');
  }

  private updateVtlWithoutGuying(): void {
    const support = this.form.controls.selectedSupport.value;
    const span = this.form.controls.selectedSpan.value;
    const spanIndex = span?.index ?? 0;
    const supportIndex = support === 'LEFT' ? spanIndex : spanIndex + 1;
    if (support === null) {
      this.vtlWithoutGuying.set(null);
      return;
    }
    const vtlUnderChain = this.plotService.litData()?.vtl_under_chain;
    const rUnderChain = this.plotService.litData()?.r_under_chain;
    this.vtlWithoutGuying.set({
      chargeV: vtlUnderChain?.[0][supportIndex],
      chargeH: vtlUnderChain?.[1][supportIndex],
      chargeL: vtlUnderChain?.[2][supportIndex],
      resultant: rUnderChain?.[supportIndex]
    });
  }

  setFormValuesFromSection(): void {
    const section = this.spanService.section();
    if (!section) {
      return;
    }
    const inputs = section.vtl_and_guying?.inputs;
    const outputs = section.vtl_and_guying?.outputs;
    if (!inputs) {
      return;
    }
    const controls = this.form.controls;
    controls.selectedSpan.setValue(inputs.selectedSpan ?? null);
    controls.selectedSupport.setValue(inputs.selectedSupport ?? null);
    controls.altitude.setValue(inputs.altitude ?? null);
    controls.horizontalDistance.setValue(inputs.horizontalDistance ?? null);
    controls.hasPulley.setValue(inputs.hasPulley ?? false);
    controls.comment.setValue(section.vtl_and_guying?.comment ?? '');
    this.results.set(outputs ?? null);
  }

  onVisibleChange(visible: boolean) {
    if (!visible) {
      this.toolbarDialogService.closeTool();
    }
  }

  onCalculate = async (): Promise<void> => {
    if (!this.isFormValid()) {
      return;
    }
    const formValue = this.form.value;
    this.isCalculating.set(true);
    try {
      const { result, error } = await this.workerPythonService.runTask(Task.calculateGuying, {
        altitude: formValue.altitude!,
        horizontalDistance: formValue.horizontalDistance!,
        hasPulley: formValue.hasPulley ?? false,
        selectedSpanIndex: formValue.selectedSpan?.index || 0,
        selectedSupport: formValue.selectedSupport || null
      });
      if (error) {
        this.logger.error(error);
        return;
      }
      this.results.set(result);
    } finally {
      this.isCalculating.set(false);
    }
  };

  onExportVhl(): void {
    // TODO: Implement export functionality for VTL sans haubanage
  }

  onExport(): void {
    // TODO: Implement export functionality
  }

  onSave(): void {
    const formValue = this.form.value;
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section) {
      return;
    }
    const vtlAndGuying: VtlAndGuying = {
      inputs: {
        selectedSpan: formValue.selectedSpan ?? null,
        selectedSupport: formValue.selectedSupport ?? null,
        altitude: formValue.altitude ?? null,
        horizontalDistance: formValue.horizontalDistance ?? null,
        hasPulley: formValue.hasPulley ?? false
      },
      outputs: this.results()
        ? {
            tensionInGuy: this.results()?.tensionInGuy ?? null,
            guyAngle: this.results()?.guyAngle ?? null,
            chargeVUnderConsole: this.results()?.chargeVUnderConsole ?? null,
            chargeHUnderConsole: this.results()?.chargeHUnderConsole ?? null,
            chargeLIfPulley: this.results()?.chargeLIfPulley ?? null
          }
        : null,
      comment: formValue.comment ?? ''
    };
    section.vtl_and_guying = vtlAndGuying;
    this.sectionService.createOrUpdateSection(study, section);
    this.messageService.add({
      severity: 'success',
      summary: $localize`Successful`,
      detail: $localize`VTL and guying saved`,
      life: 3000
    });
    this.toolbarDialogService.closeTool();
  }

  isFormValid(): boolean {
    const formValue = this.form.value;
    return (
      formValue.altitude !== null &&
      formValue.horizontalDistance !== null &&
      formValue.selectedSupport !== null &&
      this.form.controls.altitude.valid &&
      this.form.controls.horizontalDistance.valid
    );
  }

  resetForm(): void {
    this.form.reset({
      selectedSpan: null,
      selectedSupport: null,
      altitude: null,
      horizontalDistance: null,
      hasPulley: false,
      comment: ''
    });
    this.supportOptions.set([]);
    this.supportType.set(null);
    this.vtlWithoutGuying.set(null);
    this.results.set(null);
  }
}
