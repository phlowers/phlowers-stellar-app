import { animate, style, transition, trigger } from '@angular/animations';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
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
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { SectionService } from '@services/section/section.service';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { InputNumberComponent } from '@shared/components/atoms/input-number/input-number.component';
import { PoseResults, PoseTableData } from '@shared/domain/models/section.model';
import { ToolbarDialogService } from '../../services/toolbar-dialog.service';
import { NotificationService } from '@core/services/notification/notification.service';

@Component({
  selector: 'app-pose-table',
  imports: [IconComponent, ButtonComponent, InputNumberComponent, ReactiveFormsModule],
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
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  readonly LOWEST_TEMP_MIN = -50;
  readonly LOWEST_TEMP_MAX = 250;
  readonly LOWEST_TEMP_STEP = 0.01;
  readonly LOWEST_TEMP_DEFAULT = -10;

  readonly COMPUTING_STEP_MIN = 1;
  readonly COMPUTING_STEP_MAX = 10;
  readonly COMPUTING_STEP_DEFAULT = 5;

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly spanService = inject(PlotSpanService);
  private readonly plotService = inject(PlotService);
  private readonly sectionService = inject(SectionService);
  private readonly notificationService = inject(NotificationService);

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

  readonly results = signal<PoseResults | null>(null);

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    effect(() => {
      const saved = this.spanService.section()?.pose_table;
      if (saved) {
        this.form.setValue({ lowestTemp: saved.lowestTemp, computingStep: saved.computingStep });
        this.results.set(saved.results);
      } else {
        this.form.setValue({
          lowestTemp: this.LOWEST_TEMP_DEFAULT,
          computingStep: this.COMPUTING_STEP_DEFAULT
        });
        this.results.set(null);
      }
    });
  }

  calculate(): void {
    if (this.form.invalid) return;
    const temperatures = [-35, -35, -35, -35, -35, -35, -35, -35];
    const poseParams = [2454, 2454, 2454, 2454, 2454, 2454, 2454, 2454];
    const tensions = [5636, 5636, 5636, 5636, 5636, 5636, 5636, 5636];

    this.results.set({ temperatures, poseParams, tensions });
  }

  async save(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    const res = this.results();
    if (!study || !section || !res || this.form.invalid) return;

    const data: PoseTableData = {
      lowestTemp: this.form.controls.lowestTemp.value,
      computingStep: this.form.controls.computingStep.value,
      results: res
    };
    try {
      await this.sectionService.createOrUpdateSection(study, { ...section, pose_table: data });
      this.notificationService.success($localize`Pose table saved`);
    } catch {
      this.notificationService.error($localize`Failed to save pose table`);
    }
  }

  getLowestTempError(): string {
    const e = this.form.controls.lowestTemp.errors;
    if (e?.['required']) return $localize`Required`;
    if (e?.['maxTwoDecimals']) return $localize`Maximum 2 decimal places`;
    if (e?.['min']) return $localize`Minimum value:` + ' ' + this.LOWEST_TEMP_MIN + '°C';
    if (e?.['max']) return $localize`Maximum value:` + ' ' + this.LOWEST_TEMP_MAX + '°C';
    return '';
  }

  getComputingStepError(): string {
    const e = this.form.controls.computingStep.errors;
    if (e?.['required']) return $localize`Required`;
    if (e?.['integer']) return $localize`Value must be a whole number`;
    if (e?.['min']) return $localize`Minimum value:` + ' ' + this.COMPUTING_STEP_MIN;
    if (e?.['max']) return $localize`Maximum value:` + ' ' + this.COMPUTING_STEP_MAX;
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
