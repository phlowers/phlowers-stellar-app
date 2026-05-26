import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  untracked,
  viewChild
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { SectionService } from '@services/section/section.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputNumberComponent } from '@shared/components/atoms/input-number/input-number.component';
import { PoseResults, PoseTableData } from '@shared/domain/models/section.model';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { WorkerPythonService } from '@services/worker_python/worker-python.service';
import { Task } from '@services/worker_python/tasks/types';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-pose-table',
  imports: [IconComponent, ButtonComponent, InputNumberComponent, ReactiveFormsModule, DecimalPipe, MessageModule],
  templateUrl: './pose-table.component.html',
  styleUrl: './pose-table.component.scss',
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
export class PoseTableComponent {
  poseTableError = signal<boolean>(false);

  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  readonly LOWEST_TEMP_MIN = -50;
  readonly LOWEST_TEMP_MAX = 250;
  readonly LOWEST_TEMP_STEP = 1;
  readonly LOWEST_TEMP_DEFAULT = -10;

  readonly COMPUTING_STEP_MIN = 1;
  readonly COMPUTING_STEP_MAX = 10;
  readonly COMPUTING_STEP_DEFAULT = 5;

  readonly TABLE_NUMBER_VALUES = 8;

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);
  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);
  private readonly workerPythonService = inject(WorkerPythonService);

  readonly isPlotReady = computed(() => this.plotService.litData() !== null);

  readonly selectedInitialCondition = computed(() => {
    const section = this.spanService.section();
    if (!section) return null;
    return section.initial_conditions.find((ic) => ic.uuid === section.selected_initial_condition_uuid) ?? null;
  });

  readonly baseParam = computed(() => this.selectedInitialCondition()?.base_parameters ?? null);
  readonly baseTemp = computed(() => this.selectedInitialCondition()?.base_temperature ?? null);

  readonly form = new FormGroup({
    lowestTemp: new FormControl<number>(this.LOWEST_TEMP_DEFAULT, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(this.LOWEST_TEMP_MIN),
        Validators.max(this.LOWEST_TEMP_MAX),
        PoseTableComponent.maxTwoDecimalsValidator
      ]
    }),
    computingStep: new FormControl<number>(this.COMPUTING_STEP_DEFAULT, {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.min(this.COMPUTING_STEP_MIN),
        Validators.max(this.COMPUTING_STEP_MAX),
        PoseTableComponent.integerValidator
      ]
    })
  });

  readonly isCalculating = signal(false);
  readonly isCalculatingEquivalentSpan = signal(false);
  readonly isBusy = computed(() => !this.isPlotReady() || this.isCalculating());
  readonly results = signal<PoseResults | null>(null);
  readonly equivalentSpan = signal<number | null>(null);

  protected readonly _templatesEffect = effect(() => {
    const header = this.headerTemplate();
    const footer = this.footerTemplate();
    if (header && footer) {
      this.toolbarDialogService.setTemplates({ header, footer });
    }
  });

  protected readonly _formSyncEffect = effect(() => {
    const saved = this.spanService.section()?.pose_table;
    if (saved) {
      this.form.setValue({ lowestTemp: saved.lowestTemp, computingStep: saved.computingStep });
      if (this.isPlotReady()) {
        untracked(() => {
          void this.calculate();
        });
      } else {
        this.results.set(null);
        this.poseTableError.set(false);
      }
    } else {
      this.form.setValue({
        lowestTemp: this.LOWEST_TEMP_DEFAULT,
        computingStep: this.COMPUTING_STEP_DEFAULT
      });
      this.results.set(null);
    }
  });

  protected readonly _equivalentSpanEffect = effect(() => {
    const section = this.spanService.section();
    if (!this.isPlotReady() || !section) {
      untracked(() => this.equivalentSpan.set(null));
      return;
    }
    untracked(async () => {
      this.isCalculatingEquivalentSpan.set(true);
      try {
        const { result } = await this.workerPythonService.runTask(Task.getEquivalentSpan, undefined);
        this.equivalentSpan.set(result.equivalentSpan);
      } finally {
        this.isCalculatingEquivalentSpan.set(false);
      }
    });
  });

  async calculate(): Promise<void> {
    if (this.form.invalid) return;
    this.poseTableError.set(false);
    this.isCalculating.set(true);
    try {
      const { result, error } = await this.workerPythonService.runTask(Task.getPoseTable, {
        stepTemperature: this.form.controls.computingStep.value,
        baseTemperature: this.form.controls.lowestTemp.value,
        numberValues: this.TABLE_NUMBER_VALUES
      });
      if (error) {
        this.poseTableError.set(true);
      }
      this.results.set(result);
    } finally {
      this.isCalculating.set(false);
    }
  }

  async save(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section || this.form.invalid) return;

    const data: PoseTableData = {
      lowestTemp: this.form.controls.lowestTemp.value,
      computingStep: this.form.controls.computingStep.value
    };
    try {
      await this.sectionService.createOrUpdateSection(study, { ...section, pose_table: data });
      this.notificationService.success($localize`Pose table saved`);
    } catch {
      this.notificationService.error($localize`Failed to save pose table`);
    }
  }

  getLowestTempError(): string {
    const errors = this.form.controls.lowestTemp.errors;
    if (errors?.['required']) return $localize`Required`;
    if (errors?.['maxTwoDecimals']) return $localize`Maximum 2 decimal places`;
    if (errors?.['min']) return $localize`Minimum value:` + ' ' + this.LOWEST_TEMP_MIN + '°C';
    if (errors?.['max']) return $localize`Maximum value:` + ' ' + this.LOWEST_TEMP_MAX + '°C';
    return '';
  }

  getComputingStepError(): string {
    const errors = this.form.controls.computingStep.errors;
    if (errors?.['required']) return $localize`Required`;
    if (errors?.['integer']) return $localize`Value must be a whole number`;
    if (errors?.['min']) return $localize`Minimum value:` + ' ' + this.COMPUTING_STEP_MIN;
    if (errors?.['max']) return $localize`Maximum value:` + ' ' + this.COMPUTING_STEP_MAX;
    return '';
  }

  private static maxTwoDecimalsValidator(control: AbstractControl): ValidationErrors | null {
    if (control.value === null) return null;
    const str = control.value.toString();
    const sep = str.indexOf('.');
    return sep !== -1 && str.length - sep - 1 > 2 ? { maxTwoDecimals: true } : null;
  }

  private static integerValidator(control: AbstractControl): ValidationErrors | null {
    return control.value !== null && !Number.isInteger(control.value) ? { integer: true } : null;
  }
}
