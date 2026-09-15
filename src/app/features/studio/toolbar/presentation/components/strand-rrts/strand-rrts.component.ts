import { animate, style, transition, trigger } from '@angular/animations';
import {
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
  TemplateRef,
  untracked,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { SelectModule } from 'primeng/select';
import { IconComponent } from '@shared/components/atoms/icon/icon.component';
import { ButtonComponent } from '@shared/components/atoms/button/button.component';
import { ToolbarDialogService } from '@features/studio/toolbar/presentation/services/toolbar-dialog.service';
import { PlotService } from '@services/plot/plot.service';
import { PlotSpanService } from '@services/plot/plot-span.service';
import { maxDecimalsValidator } from '@shared/helpers/numberValidators';
import { getNumberInputErrorParams } from '@shared/helpers/formErrors.helpers';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CablesService } from '@shared/catalog/services/cables.service';
import { WorkerPythonService } from '@core/services/worker_python/worker-python.service';
import { NotificationService } from '@core/services/notification/notification.service';
import { Task } from '@core/services/worker_python/tasks/types';
import { RrtsCutStrandsData } from '@shared/domain/models/section.model';
import { PythonDiagnostic } from '@core/services/worker_python/tasks/python-diagnostic.interfaces';
import { formatPythonError } from '@services/worker_python/tasks/python-error-messages';
import { SectionService } from '@services/section/section.service';

const DISTANCE_MAX = 5000;
const STRAND_LAYER_KEYS = [
  'nb_strand_layer_1',
  'nb_strand_layer_2',
  'nb_strand_layer_3',
  'nb_strand_layer_4',
  'nb_strand_layer_5',
  'nb_strand_layer_6',
  'nb_strand_layer_7',
  'nb_strand_layer_8'
] as const;

const cutStrandsControl = (max: number) =>
  new FormControl<number>(0, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.max(max), maxDecimalsValidator(0)]
  });

@Component({
  selector: 'app-strand-rrts',
  imports: [
    IconComponent,
    TranslocoModule,
    ButtonComponent,
    ReactiveFormsModule,
    SelectModule,
    InputTextModule,
    MessageModule,
    InputGroupModule,
    InputGroupAddonModule,
    DecimalPipe
  ],
  templateUrl: './strand-rrts.component.html',
  styleUrl: './strand-rrts.component.scss',
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ])
    ])
  ]
})
export class StrandRrtsComponent {
  readonly headerTemplate = viewChild<TemplateRef<unknown>>('header');
  readonly footerTemplate = viewChild<TemplateRef<unknown>>('footer');

  private readonly toolbarDialogService = inject(ToolbarDialogService);
  private readonly plotService = inject(PlotService);
  private readonly translocoService = inject(TranslocoService);
  private readonly cablesService = inject(CablesService);
  private readonly workerPythonService = inject(WorkerPythonService);
  private readonly notificationService = inject(NotificationService);
  private readonly sectionService = inject(SectionService);
  readonly spanService = inject(PlotSpanService);

  readonly DISTANCE_MAX = DISTANCE_MAX;

  readonly form = new FormGroup({
    span: new FormControl<{ index: number; uuid: string } | null>(null, Validators.required),
    supportRef: new FormControl<'LEFT' | 'RIGHT' | null>({ value: null, disabled: true }, Validators.required),
    distanceSupportRef: new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(DISTANCE_MAX),
      maxDecimalsValidator(2)
    ]),
    cutStrands: new FormArray<FormControl<number>>([])
  });

  readonly cableName = computed(() => this.spanService.section()?.cable_name ?? null);

  private readonly cable = resource({
    params: () => this.cableName() ?? undefined,
    loader: ({ params }) => this.cablesService.getCable(params)
  });

  // One entry per cable layer with strands; its strand count bounds the cut strands input
  readonly layers = computed(() => {
    const cable = this.cable.value();
    if (!cable) return [];
    return STRAND_LAYER_KEYS.map((key, i) => ({ layer: i + 1, max: cable[key] ?? 0 }))
      .filter(({ max }) => max > 0)
      .map((layer) => ({ ...layer, control: cutStrandsControl(layer.max) }));
  });

  private readonly selectedSpan = toSignal(this.form.controls.span.valueChanges, { initialValue: null });

  readonly supportOptions = computed(() => this.spanService.getSupportOptions(this.selectedSpan()?.uuid ?? null));

  readonly workLoad = computed(() => {
    const rates = this.plotService.litData()?.output_parameters.utilization_rate;
    if (!rates?.length) return null;
    // No span selected: section max, like the studio page default
    const index = this.selectedSpan()?.index;
    return index === undefined ? Math.max(...rates) : (rates[index] ?? null);
  });

  // Engine returns the RRTS in N; displayed in daN like the other tensions
  readonly rrts = signal<number | null>(null);
  // Cut strands the displayed results were computed with, so a save never pairs results with edited inputs
  private calculatedCutStrands: number[] = [];
  private readonly newUtilizationRates = signal<number[] | null>(null);

  readonly newWorkLoad = computed(() => {
    const rates = this.newUtilizationRates() ?? [];
    const index = this.selectedSpan()?.index;
    if (index !== undefined) return Number.isFinite(rates[index]) ? rates[index] : null;
    // Support-sized array: last value is NaN (null once serialized), so skip non-finite values for the max
    const finite = rates.filter(Number.isFinite);
    return finite.length ? Math.max(...finite) : null;
  });

  readonly isCalculating = signal(false);
  readonly isSaved = computed(() => !!this.spanService.section()?.rrts_cut_strands);

  constructor() {
    effect(() => {
      const header = this.headerTemplate();
      const footer = this.footerTemplate();
      if (header && footer) {
        this.toolbarDialogService.setTemplates({ header, footer });
      }
    });

    effect(() => {
      const controls = this.layers().map(({ control }) => control);
      untracked(() => this.form.setControl('cutStrands', new FormArray(controls)));
    });

    // Restore the section's saved inputs and results once the cable layers are known
    effect(() => {
      const saved = this.spanService.section()?.rrts_cut_strands;
      const layers = this.layers();
      if (!saved) return;
      untracked(() => {
        const { span, supportRef, distanceSupportRef } = saved;
        this.form.patchValue({ span, supportRef, distanceSupportRef });
        layers.forEach(({ layer, control }) => control.setValue(saved.cutStrands[layer - 1] ?? 0));
        this.calculatedCutStrands = saved.cutStrands;
        this.rrts.set(saved.rrts);
        this.newUtilizationRates.set(saved.utilizationRates);
      });
    });

    effect(() => {
      const supportRef = this.form.controls.supportRef;
      if (this.selectedSpan()) {
        supportRef.enable();
        untracked(() => supportRef.setValue(supportRef.value ?? 'LEFT'));
      } else {
        supportRef.reset();
        supportRef.disable();
      }
    });
  }

  getError(control: AbstractControl): string {
    if (control.errors?.['required']) return this.translocoService.translate('common.required');
    const numberError = getNumberInputErrorParams(control);
    return numberError ? this.translocoService.translate(numberError.key, numberError.params) : '';
  }

  async calculate(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isCalculating.set(true);
    this.rrts.set(null);
    this.newUtilizationRates.set(null);
    try {
      // Engine expects all 8 layers; layers without strands stay at 0
      const cutStrands = Array<number>(STRAND_LAYER_KEYS.length).fill(0);
      this.layers().forEach(({ layer, control }) => (cutStrands[layer - 1] = control.value));

      const setRes = await this.workerPythonService.runTask(Task.setCutStrands, { cutStrands });
      if (setRes.error) return this.notifyError(setRes.diagnostics);
      const rrtsRes = await this.workerPythonService.runTask(Task.getRrts, undefined);
      if (rrtsRes.error || !rrtsRes.result) return this.notifyError(rrtsRes.diagnostics);
      const rateRes = await this.workerPythonService.runTask(Task.getUtilizationRate, undefined);
      if (rateRes.error || !rateRes.result) return this.notifyError(rateRes.diagnostics);

      this.calculatedCutStrands = cutStrands;
      this.rrts.set(rrtsRes.result.rrts / 10);
      this.newUtilizationRates.set(rateRes.result.utilizationRate);
    } catch {
      this.notifyError();
    } finally {
      this.isCalculating.set(false);
    }
  }

  async save(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    const { span, supportRef, distanceSupportRef } = this.form.getRawValue();
    const rrts = this.rrts();
    const utilizationRates = this.newUtilizationRates();
    if (!study || !section || this.form.invalid || !span || !supportRef || distanceSupportRef === null) return;
    if (rrts === null || !utilizationRates) return;

    const data: RrtsCutStrandsData = {
      span,
      supportRef,
      distanceSupportRef,
      cutStrands: this.calculatedCutStrands,
      rrts,
      utilizationRates
    };
    try {
      const updated = { ...section, rrts_cut_strands: data };
      await this.sectionService.createOrUpdateSection(study, updated);
      this.spanService.section.set(updated);
      this.notificationService.success(this.translocoService.translate('studio.rrts-cut-strands.saved'));
    } catch {
      this.notificationService.error(this.translocoService.translate('studio.rrts-cut-strands.failed-to-save'));
    }
  }

  async delete(): Promise<void> {
    const study = this.plotService.study();
    const section = this.spanService.section();
    if (!study || !section?.rrts_cut_strands) return;

    const { rrts_cut_strands: _, ...rest } = section;
    try {
      await this.sectionService.createOrUpdateSection(study, rest);
      this.spanService.section.set(rest);
    } catch {
      this.notificationService.error(this.translocoService.translate('studio.rrts-cut-strands.failed-to-delete'));
      return;
    }
    this.form.reset();
    this.rrts.set(null);
    this.newUtilizationRates.set(null);
    this.calculatedCutStrands = [];
    // Put the engine back to an undamaged cable
    const { error } = await this.workerPythonService.runTask(Task.setCutStrands, {
      cutStrands: Array<number>(STRAND_LAYER_KEYS.length).fill(0)
    });
    if (error) {
      this.notifyError();
      return;
    }
    this.notificationService.success(this.translocoService.translate('studio.rrts-cut-strands.deleted'));
  }

  private notifyError(diagnostics: PythonDiagnostic[] = []): void {
    const code = diagnostics.find((d) => d.origin === 'exception')?.code ?? null;
    this.notificationService.error(
      formatPythonError(code, this.translocoService) ?? this.translocoService.translate('studio.calculation-error')
    );
  }
}
